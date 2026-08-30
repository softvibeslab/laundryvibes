const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../app');
const Order = require('../models/userOrder');
const Worker = require('../models/Worker/workerModel');
const User = require('../models/user');
const AuditEvent = require('../models/auditEvent');
const { STATES, TRANSITIONS } = require('../services/orderStateService');
const { buildFilter, notifyCompleted, parsePagination, paymentStatusFilter } = require('../controllers/worker/All-Orders/allorders');

const ids = {
  user: '507f1f77bcf86cd799439011', other: '507f1f77bcf86cd799439012',
  worker: '507f1f77bcf86cd799439013', worker2: '507f1f77bcf86cd799439014',
  admin: '507f1f77bcf86cd799439015', order: '507f1f77bcf86cd799439016',
};
const session = { id: 'workflow-test-session' };
const config = {
  jwtSecret: 'workflow-test-secret-with-enough-entropy', corsOrigins: [], payloadLimit: '100kb',
  accountLookup: async (claims) => ({ role: claims.role, active: true, tokenVersion: 0 }),
  transactionRunner: async (work) => work(session),
};
const app = createApp(config);
const auth = (role, userId = ids[role]) => `Bearer ${jwt.sign({ role, userId, tokenVersion: 0 }, config.jwtSecret)}`;
function stub(object, property, replacement) {
  const original = object[property]; object[property] = replacement; return () => { object[property] = original; };
}
function baseOrder(overrides = {}) {
  return {
    _id: ids.order, userId: ids.user, numberOfClothes: 3, weight: 2,
    status: 'Pending', createdAt: new Date('2026-08-30T10:00:00Z'), timeline: [], ...overrides,
  };
}
function queryResult(value) {
  return { session(received) { assert.equal(received, session); return Promise.resolve(value); } };
}
function stubAudit(captured) {
  return stub(AuditEvent, 'create', async (events, options) => {
    captured.push({ event: Array.isArray(events) ? events[0] : events, options });
    return Array.isArray(events) ? events : [events];
  });
}

test('workflow defines the canonical state graph and cancelled schema state', () => {
  assert.deepEqual(STATES, ['Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled']);
  assert.deepEqual(TRANSITIONS.Pending, ['In Progress', 'Cancelled']);
  assert.deepEqual(TRANSITIONS['In Progress'], ['Completed', 'Cancelled']);
  assert.deepEqual(TRANSITIONS.Completed, ['Delivered']);
  assert.deepEqual(Order.schema.path('status').options.enum, STATES);
  assert.ok(Order.schema.indexes().some(([fields]) => fields.assignedWorker === 1 && fields.status === 1));
  assert.ok(Order.schema.indexes().some(([fields]) => fields['payment.current.status'] === 1));
});

test('transition is conditional, appends timeline and writes audit in the same transaction', async () => {
  let updateCall; const audits = [];
  const restores = [
    stub(Order, 'findById', () => queryResult(baseOrder({ status: 'Pending', assignedWorker: ids.worker }))),
    stub(Order, 'findOneAndUpdate', async (...args) => {
      updateCall = args;
      return baseOrder({ status: 'In Progress', assignedWorker: ids.worker, timeline: [args[1].$push.timeline] });
    }),
    stubAudit(audits),
  ];
  try {
    const response = await request(app).patch(`/api/worker/orders/${ids.order}/transition`)
      .set('Authorization', auth('worker')).send({ status: 'In Progress', comment: 'Recibido', origin: 'web' });
    assert.equal(response.status, 200);
    assert.equal(response.body.order.status, 'In Progress');
    assert.deepEqual(updateCall[0], { _id: ids.order, status: 'Pending', assignedWorker: ids.worker });
    assert.equal(Object.hasOwn(updateCall[1].$set, 'assignedWorker'), false);
    assert.equal(updateCall[1].$push.timeline.actor.role, 'worker');
    assert.equal(updateCall[1].$push.timeline.comment, 'Recibido');
    assert.equal(updateCall[1].$push.timeline.origin, 'web');
    assert.equal(updateCall[2].session, session);
    assert.equal(audits[0].event.action, 'order.transition');
    assert.equal(audits[0].options.session, session);
  } finally { restores.reverse().forEach((restore) => restore()); }
});

test('illegal skips, invalid ObjectIds and cancellation without reason fail safely', async () => {
  assert.equal((await request(app).patch('/api/worker/orders/not-an-id/transition').set('Authorization', auth('worker')).send({ status: 'In Progress' })).status, 400);
  const restore = stub(Order, 'findById', () => queryResult(baseOrder({ status: 'Pending' })));
  try {
    const skip = await request(app).patch(`/api/worker/orders/${ids.order}/transition`).set('Authorization', auth('worker')).send({ status: 'Completed' });
    assert.equal(skip.status, 409);
    const noReason = await request(app).patch(`/api/worker/orders/${ids.order}/transition`).set('Authorization', auth('worker')).send({ status: 'Cancelled' });
    assert.equal(noReason.status, 400);
  } finally { restore(); }
});

test('two concurrent transitions cannot both win the status compare-and-set', async () => {
  let writes = 0; const audits = [];
  const restores = [
    stub(Order, 'findById', () => queryResult(baseOrder({ status: 'Pending', assignedWorker: ids.worker }))),
    stub(Order, 'findOneAndUpdate', async (_filter, update) => {
      writes += 1;
      return writes === 1 ? baseOrder({ status: 'In Progress', assignedWorker: ids.worker, timeline: [update.$push.timeline] }) : null;
    }),
    stubAudit(audits),
  ];
  try {
    const calls = [1, 2].map(() => request(app).patch(`/api/worker/orders/${ids.order}/transition`)
      .set('Authorization', auth('worker')).send({ status: 'In Progress' }));
    const responses = await Promise.all(calls);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    assert.equal(audits.length, 1);
  } finally { restores.reverse().forEach((restore) => restore()); }
});

test('RBAC blocks customers and worker reopen; admin reopen requires and audits reason', async () => {
  assert.equal((await request(app).patch(`/api/worker/orders/${ids.order}/transition`).set('Authorization', auth('user')).send({ status: 'In Progress' })).status, 403);
  assert.equal((await request(app).patch(`/api/worker/orders/${ids.order}/reopen`).set('Authorization', auth('worker')).send({ reason: 'Corrección' })).status, 403);
  assert.equal((await request(app).patch(`/api/admin/orders/${ids.order}/reopen`).set('Authorization', auth('admin')).send({})).status, 400);
  const audits = []; let filter;
  const restores = [
    stub(Order, 'findById', () => queryResult(baseOrder({ status: 'Cancelled' }))),
    stub(Order, 'findOneAndUpdate', async (...args) => { filter = args[0]; return baseOrder({ status: 'In Progress', timeline: [args[1].$push.timeline] }); }),
    stubAudit(audits),
  ];
  try {
    const response = await request(app).patch(`/api/admin/orders/${ids.order}/reopen`)
      .set('Authorization', auth('admin')).send({ reason: 'Reproceso autorizado' });
    assert.equal(response.status, 200);
    assert.equal(filter.status, 'Cancelled');
    assert.equal(audits[0].event.metadata.reason, 'Reproceso autorizado');
  } finally { restores.reverse().forEach((restore) => restore()); }
});

test('assignment validates active worker and workers cannot reassign another worker', async () => {
  let assignmentFilter; const audits = [];
  const restores = [
    stub(Worker, 'findOne', async () => ({ _id: ids.worker, active: true, role: 'worker' })),
    stub(Order, 'findById', () => queryResult(baseOrder({ status: 'Pending' }))),
    stub(Order, 'findOneAndUpdate', async (...args) => { assignmentFilter = args[0]; return baseOrder({ assignedWorker: ids.worker, timeline: [args[1].$push.timeline] }); }),
    stubAudit(audits),
  ];
  try {
    const self = await request(app).patch(`/api/worker/orders/${ids.order}/assignment`)
      .set('Authorization', auth('worker')).send({ workerId: ids.worker });
    assert.equal(self.status, 200);
    assert.ok(assignmentFilter.$or);
    assert.equal(audits[0].event.action, 'order.assignment');
    const forbidden = await request(app).patch(`/api/worker/orders/${ids.order}/assignment`)
      .set('Authorization', auth('worker')).send({ workerId: ids.worker2 });
    assert.equal(forbidden.status, 403);
  } finally { restores.reverse().forEach((restore) => restore()); }

  const restore = stub(Worker, 'findOne', async () => null);
  try {
    assert.equal((await request(app).patch(`/api/admin/orders/${ids.order}/assignment`)
      .set('Authorization', auth('admin')).send({ workerId: ids.worker2 })).status, 409);
  } finally { restore(); }
});

test('Completed SMS claim is idempotent and delivery failure never changes order state', async () => {
  let workflowWrite = 0; let claims = 0; let smsCalls = 0; const audits = [];
  const completedEvent = '507f1f77bcf86cd799439019';
  app.locals.smsSender = async () => { smsCalls += 1; throw new Error('provider down'); };
  const restores = [
    stub(Order, 'findById', () => queryResult(baseOrder({ status: 'In Progress', assignedWorker: ids.worker }))),
    stub(Order, 'findOneAndUpdate', (...args) => {
      if (args[0].status === 'In Progress') {
        workflowWrite += 1;
        return Promise.resolve(baseOrder({ status: 'Completed', assignedWorker: ids.worker, completionNotification: { transitionEventId: completedEvent, status: 'pending' }, timeline: [args[1].$push.timeline] }));
      }
      claims += 1;
      assert.equal(args[0].$or[1]['completionNotification.status'], 'sending');
      assert.ok(args[0].$or[1]['completionNotification.leaseExpiresAt'].$lte instanceof Date);
      assert.ok(args[1].$set['completionNotification.claimToken']);
      assert.ok(args[1].$set['completionNotification.leaseExpiresAt'] instanceof Date);
      assert.equal(args[1].$inc['completionNotification.attempts'], 1);
      const claimed = claims === 1 ? baseOrder({ status: 'Completed', userId: { _id: ids.user, phoneNumber: '+525551234567' }, completionNotification: { transitionEventId: completedEvent, status: 'sending' } }) : null;
      return { populate: async () => claimed };
    }),
    stub(Order, 'updateOne', async (filter, update) => {
      assert.equal(filter['completionNotification.transitionEventId'], completedEvent);
      assert.ok(filter['completionNotification.claimToken']);
      assert.equal(update.$set['completionNotification.status'], 'failed');
      assert.equal(Object.hasOwn(update.$set, 'status'), false);
      assert.equal(update.$push.timeline.type, 'notification');
      return { modifiedCount: 1 };
    }),
    stubAudit(audits),
  ];
  try {
    const response = await request(app).patch(`/api/worker/orders/${ids.order}/transition`)
      .set('Authorization', auth('worker')).send({ status: 'Completed' });
    assert.equal(response.status, 200);
    assert.equal(response.body.order.status, 'Completed');
    assert.equal(response.body.notification, 'failed');
    assert.equal(workflowWrite, 1);
    assert.equal(smsCalls, 1);
  } finally { delete app.locals.smsSender; restores.reverse().forEach((restore) => restore()); }
});

test('detail validates ObjectId before Mongo and canonical routes enforce ownership/RBAC', async () => {
  assert.equal((await request(app).get('/api/user/orders/bad').set('Authorization', auth('user'))).status, 400);
  assert.equal((await request(app).get('/api/admin/orders/bad').set('Authorization', auth('admin'))).status, 400);
  assert.equal((await request(app).get('/api/user/orders').set('Authorization', auth('worker'))).status, 403);
});

test('pagination and all operational filters are validated and translated server-side', async () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 25 });
  assert.throws(() => parsePagination({ page: '0' }), /paginación/);
  assert.throws(() => parsePagination({ limit: '101' }), /paginación/);
  const original = User.find;
  User.find = (search) => ({ select: () => ({ limit: (limit) => ({ lean: async () => {
    assert.equal(limit, 501);
    assert.ok(search.bagNumber instanceof RegExp); assert.ok(search.name instanceof RegExp);
    assert.ok(search.phoneNumber instanceof RegExp); assert.ok(search.roomNumber instanceof RegExp);
    return [{ _id: ids.user }];
  } }) }) });
  try {
    const filter = await buildFilter({
      user: { role: 'admin' }, query: {
        status: 'Pending,In Progress', payment: 'paid', workerId: ids.worker,
        dateFrom: '2026-08-01', dateTo: '2026-08-31', bagNumber: 'B-1',
        client: 'Ana', phone: '555', room: '101',
      },
    });
    assert.deepEqual(filter.status, { $in: ['Pending', 'In Progress'] });
    assert.deepEqual(filter.$and, [paymentStatusFilter('paid')]);
    assert.equal(filter.assignedWorker, ids.worker);
    assert.deepEqual(filter.userId.$in, [ids.user]);
    await assert.rejects(() => buildFilter({ user: { role: 'admin' }, query: { status: 'Hacked' } }), /estado/);
    await assert.rejects(() => buildFilter({ user: { role: 'admin' }, query: { payment: 'refunded' } }), /pago/);
    await assert.rejects(() => buildFilter({ user: { role: 'admin' }, query: { workerId: 'bad' } }), /trabajador/);
    await assert.rejects(() => buildFilter({ user: { role: 'admin' }, query: { dateFrom: 'later' } }), /fecha/);
  } finally { User.find = original; }
});

test('order timeline rejects replacement/removal update APIs before database execution', async () => {
  await assert.rejects(() => Order.updateOne({ _id: ids.order }, { $set: { timeline: [] } }), /append-only/);
  await assert.rejects(() => Order.updateOne({ _id: ids.order }, { $pull: { timeline: {} } }), /append-only/);
  await assert.rejects(() => Order.updateOne({ _id: ids.order }, { $rename: { timeline: 'oldTimeline' } }), /append-only/);
  await assert.rejects(() => Order.updateOne({ _id: ids.order }, { $rename: { oldTimeline: 'timeline' } }), /append-only/);
  await assert.rejects(() => Order.updateOne({ _id: ids.order }, { $push: { timeline: { $each: [], $slice: -1 } } }), /append-only/);
  await assert.rejects(() => Order.updateOne({ _id: ids.order }, [{ $set: { timeline: [] } }]), /append-only/);
  await assert.rejects(() => Order.replaceOne({ _id: ids.order }, baseOrder()), /append-only/);
  await assert.rejects(() => Order.deleteOne({ _id: ids.order }), /append-only/);
  await assert.rejects(() => Order.bulkWrite([{ deleteOne: { filter: { _id: ids.order } } }]), /append-only/);
  await assert.rejects(() => Order.bulkWrite([{ updateOne: { filter: { _id: ids.order }, update: { $unset: { timeline: 1 } } } }]), /append-only/);
});

test('reopen revalidates assignment and clears inactive worker under assignment CAS', async () => {
  let filter; let update; const audits = [];
  const restores = [
    stub(Order, 'findById', () => queryResult(baseOrder({ status: 'Cancelled', assignedWorker: ids.worker2 }))),
    stub(Worker, 'findOne', async () => null),
    stub(Order, 'findOneAndUpdate', async (...args) => { [filter, update] = args; return baseOrder({ status: 'In Progress', assignedWorker: null, timeline: [args[1].$push.timeline] }); }),
    stubAudit(audits),
  ];
  try {
    const response = await request(app).patch(`/api/admin/orders/${ids.order}/reopen`).set('Authorization', auth('admin')).send({ reason: 'Trabajador inactivo' });
    assert.equal(response.status, 200);
    assert.equal(filter.assignedWorker, ids.worker2);
    assert.deepEqual(update.$unset, { assignedWorker: 1, assignedAt: 1, assignedBy: 1 });
    assert.equal(audits[0].event.metadata.assignmentCleared, true);
  } finally { restores.reverse().forEach((restore) => restore()); }
});

test('customer profile filters preserve immutable ownership and never query other profiles', async () => {
  let profileFilter;
  const restore = stub(User, 'findOne', (filter) => {
    profileFilter = filter;
    return { select: () => ({ lean: async () => ({ _id: ids.user }) }) };
  });
  try {
    const filter = await buildFilter({ user: { role: 'user', userId: ids.user }, query: { client: 'Ana' } });
    assert.equal(filter.userId, ids.user);
    assert.equal(profileFilter._id, ids.user);
    assert.ok(profileFilter.name instanceof RegExp);
  } finally { restore(); }
});

test('unassigned and differently assigned workers cannot transition or retry', async () => {
  let restore = stub(Order, 'findById', () => queryResult(baseOrder({ status: 'Pending', assignedWorker: null })));
  try {
    assert.equal((await request(app).patch(`/api/worker/orders/${ids.order}/transition`).set('Authorization', auth('worker')).send({ status: 'In Progress' })).status, 403);
  } finally { restore(); }
  restore = stub(Order, 'findById', async () => baseOrder({ status: 'Completed', assignedWorker: ids.worker2, completionNotification: { transitionEventId: ids.other, status: 'failed' } }));
  try {
    assert.equal((await request(app).post(`/api/worker/orders/${ids.order}/notifications/completed/retry`).set('Authorization', auth('worker'))).status, 403);
  } finally { restore(); }
});

test('payment filters include legacy and missing records consistently with the DTO', () => {
  assert.deepEqual(paymentStatusFilter('paid'), {
    $or: [
      { 'payment.current.status': 'paid' },
      { $and: [{ 'payment.current.status': { $exists: false } }, { 'payment.status': 'paid' }] },
    ],
  });
  const unpaid = paymentStatusFilter('unpaid');
  assert.equal(unpaid.$or[0]['payment.current.status'], 'unpaid');
  assert.deepEqual(unpaid.$or[1].$and[1].$or, [
    { 'payment.status': 'unpaid' },
    { 'payment.status': { $exists: false } },
    { 'payment.status': null },
  ]);
});

test('SMS lease claim includes worker assignment CAS and detects reassignment races', async () => {
  let claimFilter;
  const restores = [
    stub(Order, 'findOneAndUpdate', (filter) => {
      claimFilter = filter;
      return { populate: async () => null };
    }),
    stub(Order, 'findById', () => ({
      select: async () => ({ assignedWorker: ids.worker2, completionNotification: { status: 'pending' } }),
    })),
  ];
  try {
    const result = await notifyCompleted({
      user: { role: 'worker', userId: ids.worker },
      app: { locals: { smsSender: async () => ({}) } },
    }, baseOrder({
      status: 'Completed',
      assignedWorker: ids.worker,
      completionNotification: { transitionEventId: ids.other, status: 'pending' },
    }));
    assert.equal(claimFilter.assignedWorker, ids.worker);
    assert.equal(result, 'assignment-changed');
  } finally { restores.reverse().forEach((restore) => restore()); }
});
