const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Order = require('../models/userOrder');
const Worker = require('../models/Worker/workerModel');
const AuditEvent = require('../models/auditEvent');
const { reopen, transition } = require('../services/orderStateService');

const mongoUrl = process.env.TEST_MONGODB_URL;

function request(orderId, actor, body = {}) {
  return {
    params: { orderId: String(orderId) },
    body,
    user: { userId: String(actor.id), role: actor.role },
    ip: '127.0.0.1',
    get: () => 'integration-order-workflow',
    app: { locals: { config: {} } },
  };
}

test('real Mongo transaction enforces one transition winner and preserves timeline/audit', { skip: !mongoUrl }, async () => {
  const dbName = `laundryvibes_order_workflow_${process.pid}`;
  await mongoose.connect(mongoUrl, { dbName });
  try {
    const worker = await Worker.create({
      email: `workflow-${process.pid}@example.test`,
      password: 'not-used-in-integration',
      role: 'worker',
      active: true,
    });
    const adminId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const order = await Order.create({
      userId,
      numberOfClothes: 5,
      weight: 2,
      status: 'Pending',
      assignedWorker: worker._id,
      assignedAt: new Date(),
      assignedBy: adminId,
      timeline: [{
        type: 'created',
        actor: { id: userId, role: 'user' },
        origin: 'web',
        timestamp: new Date(),
      }],
    });

    const workerActor = { id: worker._id, role: 'worker' };
    const races = await Promise.allSettled([
      transition(request(order._id, workerActor, { status: 'In Progress', comment: 'Inicio A' })),
      transition(request(order._id, workerActor, { status: 'In Progress', comment: 'Inicio B' })),
    ]);
    assert.equal(races.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(races.filter((result) => result.status === 'rejected').length, 1);

    let persisted = await Order.findById(order._id).lean();
    assert.equal(persisted.status, 'In Progress');
    assert.equal(persisted.timeline.filter((event) => event.type === 'transition').length, 1);
    assert.equal(await AuditEvent.countDocuments({ action: 'order.transition' }), 1);

    await transition(request(order._id, workerActor, { status: 'Completed', comment: 'Lavado listo' }));
    await transition(request(order._id, { id: adminId, role: 'admin' }, { status: 'Delivered', comment: 'Entregado' }));
    await reopen(request(order._id, { id: adminId, role: 'admin' }, { reason: 'Corrección operacional' }));

    persisted = await Order.findById(order._id).lean();
    assert.equal(persisted.status, 'In Progress');
    assert.equal(String(persisted.assignedWorker), String(worker._id));
    assert.deepEqual(
      persisted.timeline.map((event) => event.type),
      ['created', 'transition', 'transition', 'transition', 'reopened'],
    );
    assert.equal(await AuditEvent.countDocuments({ action: 'order.transition' }), 3);
    assert.equal(await AuditEvent.countDocuments({ action: 'order.reopened' }), 1);
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
