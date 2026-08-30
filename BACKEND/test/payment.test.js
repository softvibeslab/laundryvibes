const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../app');
const PaymentConfig = require('../models/paymentConfig');
const Order = require('../models/userOrder');
const { detectEvidenceType, MAX_EVIDENCE_BYTES } = require('../middleware/evidenceUpload');
const { financialDto } = require('../utils/orderDto');
const { calculateTotal, parsePrice } = require('../services/paymentService');

const config = {
  jwtSecret: 'payment-test-secret-with-enough-entropy', jwtExpiresIn: '1h',
  corsOrigins: ['https://app.example.com'], payloadLimit: '100kb',
};
const app = createApp(config);
const ids = {
  user: '507f1f77bcf86cd799439011', other: '507f1f77bcf86cd799439012',
  worker: '507f1f77bcf86cd799439013', admin: '507f1f77bcf86cd799439014',
  order: '507f1f77bcf86cd799439015',
};
const auth = (role, userId = ids[role]) => `Bearer ${jwt.sign({ role, userId }, config.jwtSecret)}`;
const effectiveConfig = () => ({
  currency: 'MXN', locale: 'es-MX', pricePerKg: 60,
  methods: [{ id: 'cash', enabled: true }, { id: 'transfer', enabled: true }, { id: 'card', enabled: true }],
});
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);

function stub(object, property, replacement) {
  const original = object[property];
  object[property] = replacement;
  return () => { object[property] = original; };
}

test('payment config endpoint is authenticated and returns singleton defaults', async () => {
  assert.equal((await request(app).get('/api/payments/config')).status, 401);
  let operation;
  const restore = stub(PaymentConfig, 'findOneAndUpdate', async (...args) => { operation = args; return effectiveConfig(); });
  try {
    const response = await request(app).get('/api/payments/config').set('Authorization', auth('user'));
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      currency: 'MXN', locale: 'es-MX', pricePerKg: 60,
      methods: [
        { id: 'cash', label: 'Efectivo', enabled: true, requiresEvidence: false },
        { id: 'transfer', label: 'Transferencia', enabled: true, requiresEvidence: true },
        { id: 'card', label: 'Tarjeta', enabled: true, requiresEvidence: true },
      ],
      comingSoon: ['PayPal', 'Mercado Pago', 'Stripe'],
    });
    assert.equal(operation[0]._id, 'global');
    assert.equal(operation[2].upsert, true);
  } finally { restore(); }
});

test('only admin updates valid config and at least one manual method remains active', async () => {
  const payload = {
    currency: 'MXN', pricePerKg: 75.25,
    methods: [{ id: 'cash', enabled: true }, { id: 'transfer', enabled: false }, { id: 'card', enabled: false }],
  };
  assert.equal((await request(app).put('/api/admin/payment-config').set('Authorization', auth('user')).send(payload)).status, 403);
  assert.equal((await request(app).put('/api/admin/payment-config').set('Authorization', auth('worker')).send(payload)).status, 403);
  const allOff = { ...payload, methods: payload.methods.map((method) => ({ ...method, enabled: false })) };
  assert.equal((await request(app).put('/api/admin/payment-config').set('Authorization', auth('admin')).send(allOff)).status, 400);
  assert.equal((await request(app).put('/api/admin/payment-config').set('Authorization', auth('admin')).send({ ...payload, pricePerKg: 1.001 })).status, 400);
  for (const invalidPrice of ['1e308', 'Infinity', '9007199254740991']) {
    assert.equal((await request(app).put('/api/admin/payment-config').set('Authorization', auth('admin')).send({ ...payload, pricePerKg: invalidPrice })).status, 400);
  }

  let update;
  const restore = stub(PaymentConfig, 'findOneAndUpdate', async (...args) => {
    update = args;
    return { ...effectiveConfig(), pricePerKg: 75.25, methods: payload.methods };
  });
  try {
    const response = await request(app).put('/api/admin/payment-config').set('Authorization', auth('admin')).send(payload);
    assert.equal(response.status, 200);
    assert.equal(response.body.pricePerKg, 75.25);
    assert.equal(response.body.methods[1].enabled, false);
    assert.equal(update[1].$set.updatedBy.actorId, ids.admin);
    assert.equal(update[2].runValidators, true);
  } finally { restore(); }
});

test('money parsing accepts 0.07 exactly and rejects non-finite or overflowing values', async () => {
  assert.deepEqual(parsePrice('0.07'), { cents: 7, value: 0.07 });
  assert.equal(parsePrice(0.07).cents, 7);
  const payload = {
    currency: 'MXN', pricePerKg: '0.07',
    methods: [{ id: 'cash', enabled: true }, { id: 'transfer', enabled: false }, { id: 'card', enabled: false }],
  };
  const restore = stub(PaymentConfig, 'findOneAndUpdate', async (_filter, operation) => ({ ...effectiveConfig(), pricePerKg: operation.$set.pricePerKg, methods: payload.methods }));
  try {
    const response = await request(app).put('/api/admin/payment-config').set('Authorization', auth('admin')).send(payload);
    assert.equal(response.status, 200);
    assert.equal(response.body.pricePerKg, 0.07);
  } finally { restore(); }
  assert.equal(parsePrice('1e308'), null);
  assert.equal(parsePrice(Infinity), null);
  assert.equal(parsePrice(Number.MAX_VALUE), null);
  assert.equal(calculateTotal('2.345', '60'), 140.7);
  assert.equal(calculateTotal('1000', '10000'), 10000000);
  assert.equal(calculateTotal('1000', '10000.01'), null);
});

test('financial models and submit controller reject Infinity and operational overflows', async () => {
  const invalidConfig = new PaymentConfig({ pricePerKg: Infinity });
  assert.ok(invalidConfig.validateSync()?.errors.pricePerKg);
  const invalidOrder = new Order({
    userId: ids.user, numberOfClothes: 1, weight: Infinity,
    pricing: { currency: 'MXN', pricePerKg: 60, total: Number.MAX_VALUE },
  });
  const errors = invalidOrder.validateSync().errors;
  assert.ok(errors.weight);
  assert.ok(errors['pricing.total']);

  const endpoint = request(app).post('/api/user/submit-order').set('Authorization', auth('user'));
  assert.equal((await endpoint.field('numberOfClothes', '1').field('weight', '1e308').field('paymentMethod', 'cash')).status, 400);
  assert.equal((await request(app).post('/api/user/submit-order').set('Authorization', auth('user'))
    .field('numberOfClothes', '9007199254740991').field('weight', '1').field('paymentMethod', 'cash')).status, 400);
});

test('submit-order calculates immutable server snapshot and never returns evidence bytes', async () => {
  const restores = [
    stub(PaymentConfig, 'findOneAndUpdate', async () => effectiveConfig()),
    stub(Order, 'create', async (value) => ({ _id: ids.order, createdAt: new Date('2026-08-29T00:00:00Z'), status: 'Pending', ...value })),
  ];
  try {
    const response = await request(app).post('/api/user/submit-order').set('Authorization', auth('user'))
      .field('numberOfClothes', '3').field('weight', '2.345').field('paymentMethod', 'transfer')
      .field('total', '0.01').attach('evidence', png, { filename: 'fake.txt', contentType: 'text/plain' });
    assert.equal(response.status, 201);
    assert.deepEqual(response.body.order.pricing, { currency: 'MXN', pricePerKg: 60, total: 140.7 });
    assert.equal(response.body.order.payment.status, 'pending_review');
    assert.equal(response.body.order.payment.evidenceAvailable, true);
    assert.equal(JSON.stringify(response.body).includes('data'), false);
  } finally { restores.reverse().forEach((restore) => restore()); }
});

test('submit-order rejects disabled methods, missing required evidence, and unnecessary cash evidence', async () => {
  const restore = stub(PaymentConfig, 'findOneAndUpdate', async () => ({
    ...effectiveConfig(), methods: [{ id: 'cash', enabled: true }, { id: 'transfer', enabled: false }, { id: 'card', enabled: true }],
  }));
  try {
    const base = () => request(app).post('/api/user/submit-order').set('Authorization', auth('user')).field('numberOfClothes', '2').field('weight', '1');
    assert.equal((await base().field('paymentMethod', 'transfer').attach('evidence', png, 'e.png')).status, 400);
    assert.equal((await base().field('paymentMethod', 'card')).status, 400);
    assert.equal((await base().field('paymentMethod', 'cash').attach('evidence', png, 'e.png')).status, 400);
  } finally { restore(); }
});

test('magic bytes accept only JPEG, PNG, WebP and PDF and upload limit is 2 MiB', async () => {
  assert.equal(MAX_EVIDENCE_BYTES, 2 * 1024 * 1024);
  assert.equal(detectEvidenceType(Buffer.from([0xff, 0xd8, 0xff])).contentType, 'image/jpeg');
  assert.equal(detectEvidenceType(png).contentType, 'image/png');
  assert.equal(detectEvidenceType(Buffer.from('RIFFxxxxWEBP')).contentType, 'image/webp');
  assert.equal(detectEvidenceType(Buffer.from('%PDF-1.7')).contentType, 'application/pdf');
  assert.equal(detectEvidenceType(Buffer.from('not an image')), null);

  const restore = stub(PaymentConfig, 'findOneAndUpdate', async () => effectiveConfig());
  try {
    const invalid = await request(app).post('/api/user/submit-order').set('Authorization', auth('user'))
      .field('numberOfClothes', '1').field('weight', '1').field('paymentMethod', 'card')
      .attach('evidence', Buffer.from('malware'), { filename: 'proof.jpg', contentType: 'image/jpeg' });
    assert.equal(invalid.status, 400);
    const oversized = await request(app).post('/api/user/submit-order').set('Authorization', auth('user'))
      .field('numberOfClothes', '1').field('weight', '1').field('paymentMethod', 'card')
      .attach('evidence', Buffer.alloc(MAX_EVIDENCE_BYTES + 1), 'proof.png');
    assert.equal(oversized.status, 413);
    assert.deepEqual(oversized.body, { message: 'La carga útil es demasiado grande' });
  } finally { restore(); }
});

test('POS is worker/admin-only and performs conditional atomic write that cannot replace paid', async () => {
  assert.equal((await request(app).patch(`/api/worker/orders/${ids.order}/payment`).set('Authorization', auth('user')).field('paymentMethod', 'cash')).status, 403);
  let filter;
  let update;
  const clientDeclaration = { method: 'transfer', source: 'client', evidence: { data: png, contentType: 'image/png', extension: 'png' } };
  const restores = [
    stub(PaymentConfig, 'findOneAndUpdate', async () => effectiveConfig()),
    stub(Order, 'findById', async () => ({ pricing: { currency: 'MXN', pricePerKg: 60, total: 60 } })),
    stub(Order, 'findOneAndUpdate', async (...args) => {
      [filter, update] = args;
      const set = update.$set;
      return { _id: ids.order, userId: ids.user, pricing: { currency: 'MXN', pricePerKg: 60, total: 60 }, payment: {
        current: { method: set['payment.current.method'], methodLabel: set['payment.current.methodLabel'], status: set['payment.current.status'], source: set['payment.current.source'], recordedAt: set['payment.current.recordedAt'] },
        clientDeclaration,
        posRecord: set['payment.posRecord'],
      } };
    }),
  ];
  try {
    const response = await request(app).patch(`/api/worker/orders/${ids.order}/payment`).set('Authorization', auth('worker')).field('paymentMethod', 'cash');
    assert.equal(response.status, 200);
    assert.equal(response.body.order.payment.status, 'paid');
    assert.deepEqual(filter['payment.current.status'], { $ne: 'paid' });
    assert.deepEqual(filter['payment.status'], { $ne: 'paid' });
    assert.equal(Object.hasOwn(update.$set, 'payment'), false);
    assert.equal(Object.keys(update.$set).some((path) => path.startsWith('payment.clientDeclaration')), false);
    assert.equal(update.$set['payment.current.status'], 'paid');
    assert.equal(response.body.order.payment.evidenceAvailable, false);
    assert.equal(JSON.stringify(response.body).includes('data'), false);
    assert.equal(clientDeclaration.evidence.data, png);
  } finally { restores.reverse().forEach((restore) => restore()); }

  const conflictRestores = [
    stub(PaymentConfig, 'findOneAndUpdate', async () => effectiveConfig()),
    stub(Order, 'findOneAndUpdate', async () => null),
    stub(Order, 'findById', async () => ({ pricing: { currency: 'MXN', pricePerKg: 60, total: 60 }, payment: { current: { status: 'paid' } } })),
  ];
  try {
    assert.equal((await request(app).patch(`/api/worker/orders/${ids.order}/payment`).set('Authorization', auth('admin')).field('paymentMethod', 'cash')).status, 409);
  } finally { conflictRestores.reverse().forEach((restore) => restore()); }
});

test('POS rejects historical orders without valid pricing with 409', async () => {
  const restores = [
    stub(PaymentConfig, 'findOneAndUpdate', async () => effectiveConfig()),
    stub(Order, 'findOneAndUpdate', async () => null),
    stub(Order, 'findById', async () => ({ pricing: undefined, payment: {} })),
  ];
  try {
    const response = await request(app).patch(`/api/worker/orders/${ids.order}/payment`).set('Authorization', auth('worker')).field('paymentMethod', 'cash');
    assert.equal(response.status, 409);
    assert.match(response.body.message, /regularízalo/);
  } finally { restores.reverse().forEach((restore) => restore()); }
});

test('evidence is private, owner/worker can select client or POS evidence, and headers are safe', async () => {
  const document = { userId: ids.user, payment: {
    current: { source: 'pos' },
    clientDeclaration: { evidence: { data: png, contentType: 'image/png', extension: 'png' } },
    posRecord: { evidence: { data: Buffer.from('%PDF-1.7'), contentType: 'application/pdf', extension: 'pdf' } },
  } };
  const restore = stub(Order, 'findById', () => ({ select: async () => document }));
  try {
    assert.equal((await request(app).get(`/api/payments/orders/${ids.order}/evidence`).set('Authorization', auth('user', ids.other))).status, 403);
    const owner = await request(app).get(`/api/payments/orders/${ids.order}/evidence`).set('Authorization', auth('user'));
    assert.equal(owner.status, 200);
    assert.equal(owner.headers['content-type'], 'application/pdf');
    assert.equal(owner.headers['x-content-type-options'], 'nosniff');
    assert.equal(owner.headers['cache-control'], 'private, no-store');
    assert.match(owner.headers['content-disposition'], /^inline;/);
    assert.equal((await request(app).get(`/api/payments/orders/${ids.order}/evidence`).set('Authorization', auth('worker'))).status, 200);
    const client = await request(app).get(`/api/payments/orders/${ids.order}/evidence?source=client`).set('Authorization', auth('worker'));
    assert.equal(client.headers['content-type'], 'image/png');
    assert.equal((await request(app).get(`/api/payments/orders/${ids.order}/evidence?source=other`).set('Authorization', auth('worker'))).status, 400);
  } finally { restore(); }
});

test('historical orders without snapshots remain DTO-compatible and buffers are excluded by schema', () => {
  assert.deepEqual(financialDto({}), {
    pricing: null,
    payment: { method: null, methodLabel: null, status: 'unpaid', statusLabel: 'Sin pagar', source: null, evidenceAvailable: false, recordedAt: null },
  });
  const clientRecordSchema = Order.schema.path('payment.clientDeclaration').schema;
  const posRecordSchema = Order.schema.path('payment.posRecord').schema;
  assert.equal(clientRecordSchema.path('evidence').schema.path('data').options.select, false);
  assert.equal(posRecordSchema.path('evidence').schema.path('data').options.select, false);
});
