const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
const { accountMatchesClaims, versionOf } = require('../services/accountService');
const { parseStockQuantity } = require('../utils/stockValidation');
const User = require('../models/user');
const Complaint = require('../models/user/Complaint Form/complaintModel');
const Stock = require('../models/Stock');
const AuditEvent = require('../models/auditEvent');
const stockController = require('../controllers/worker/stockController');

const config = {
  corsOrigins: ['https://app.example.com'], payloadLimit: '100kb', loginRateLimit: 1,
  resetRateLimit: 5, writeRateLimit: 120, jwtSecret: 'test-only-secret-with-32-characters',
  jwtExpiresIn: '1h', resetTtlMinutes: 30, transactionRunner: async (work) => work({ id: 'test-session' }), accountLookup: async (claims) => ({
    _id: claims.userId, role: claims.role, active: true, tokenVersion: claims.tokenVersion,
  }),
};

function response() {
  return {
    statusCode: 200, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
const req = (body = {}) => ({
  body, params: { id: '507f1f77bcf86cd799439011' }, user: { userId: '507f1f77bcf86cd799439012', role: 'worker' },
  ip: '127.0.0.1', get: () => 'test-agent',
  app: { locals: { config: { transactionRunner: async (work) => work({ id: 'test-session' }) } } },
});
const next = (error) => { if (error) throw error; };

test('login aliases consume one shared limiter quota', async () => {
  const app = createApp(config);
  const first = await request(app).post('/api/user/login').send({});
  assert.equal(first.status, 400);
  const alternateAlias = await request(app).post('/api/admin/login').send({});
  assert.equal(alternateAlias.status, 429);
});

test('account claims remain backward-compatible while enforcing role, active and tokenVersion', () => {
  assert.equal(versionOf(undefined), 0);
  assert.equal(accountMatchesClaims({ role: 'user' }, { role: 'user' }), true);
  assert.equal(accountMatchesClaims({ role: 'user', active: true, tokenVersion: 0 }, { role: 'user' }), true);
  assert.equal(accountMatchesClaims({ role: 'user', active: false }, { role: 'user' }), false);
  assert.equal(accountMatchesClaims({ role: 'worker', tokenVersion: 0 }, { role: 'user', tokenVersion: 0 }), false);
  assert.equal(accountMatchesClaims({ role: 'user', tokenVersion: 2 }, { role: 'user', tokenVersion: 1 }), false);
  assert.equal(accountMatchesClaims(null, { role: 'user' }), false);
});

test('bagNumber is a string in customer and complaint schemas', () => {
  assert.equal(User.schema.path('bagNumber').instance, 'String');
  assert.equal(Complaint.schema.path('bagNumber').instance, 'String');
  assert.equal(new User({ bagNumber: 'B-001' }).bagNumber, 'B-001');
  assert.equal(new Complaint({ bagNumber: '0007' }).bagNumber, '0007');
});

test('parseStockQuantity rejects coercion hazards, limits precision and supports explicit zero', () => {
  for (const invalid of [undefined, null, '', '   ', false, true, NaN, Infinity, -1, 0, '1.0001', 1_000_000.001, {}, []]) {
    assert.equal(parseStockQuantity(invalid), null, `expected ${String(invalid)} to be rejected`);
  }
  assert.equal(parseStockQuantity(0, { allowZero: true }), 0);
  assert.equal(parseStockQuantity('0', { allowZero: true }), 0);
  assert.equal(parseStockQuantity('1.125'), 1.125);
  assert.equal(parseStockQuantity(1_000_000), 1_000_000);
});

test('restock and consume use guarded atomic filters and retain status/alert/analytics updates', async () => {
  const originalUpdate = Stock.findOneAndUpdate;
  const originalAuditCreate = AuditEvent.create;
  const calls = [];
  AuditEvent.create = async (event) => event;
  Stock.findOneAndUpdate = async (filter, update, options) => {
    calls.push({ filter, update, options });
    return { _id: req().params.id, alerts: [], currentQuantity: 10 };
  };
  try {
    const restockResponse = response();
    await stockController.addStock(req({ quantityToAdd: 2 }), restockResponse, next);
    assert.deepEqual(calls[0].filter, { _id: req().params.id, currentQuantity: { $lte: 999998 } });
    assert.equal(Array.isArray(calls[0].update), true);
    assert.ok(calls[0].update.some((stage) => stage.$set?.status && stage.$set?.alerts));
    assert.equal(restockResponse.statusCode, 200);

    const consumeResponse = response();
    await stockController.recordConsumption(req({ quantityUsed: 3 }), consumeResponse, next);
    assert.deepEqual(calls[1].filter, { _id: req().params.id, currentQuantity: { $gte: 3 } });
    assert.equal(Array.isArray(calls[1].update), true);
    assert.ok(calls[1].update.some((stage) => stage.$set?.status && stage.$set?.alerts && stage.$set?.averageDailyConsumption));
    assert.ok(calls[1].update.some((stage) => stage.$set?.estimatedDepletionDate));
    assert.equal(consumeResponse.statusCode, 200);
  } finally {
    Stock.findOneAndUpdate = originalUpdate;
    AuditEvent.create = originalAuditCreate;
  }
});

test('stock create/update/restock/consume/delete successes are audited', async () => {
  const originals = {
    exists: Stock.exists, create: Stock.create, update: Stock.findOneAndUpdate,
    delete: Stock.findByIdAndDelete, audit: AuditEvent.create,
  };
  const actions = [];
  AuditEvent.create = async (event) => {
    const document = Array.isArray(event) ? event[0] : event;
    actions.push(document.action);
    return Array.isArray(event) ? [document] : document;
  };
  Stock.exists = async () => false;
  Stock.create = async (data) => ({ _id: req().params.id, ...data, alerts: [] });
  Stock.findOneAndUpdate = async () => ({ _id: req().params.id, itemKey: 'soap', alerts: [] });
  Stock.findByIdAndDelete = async () => ({ _id: req().params.id, itemKey: 'soap' });
  try {
    await stockController.createStockItem(req({ itemName: 'Soap', currentQuantity: 2, reorderLevel: 1 }), response(), next);
    await stockController.updateStockItem(req({ reorderLevel: 2 }), response(), next);
    await stockController.addStock(req({ quantityToAdd: 1 }), response(), next);
    await stockController.recordConsumption(req({ quantityUsed: 1 }), response(), next);
    await stockController.deleteStockItem(req(), response(), next);
    assert.deepEqual(actions, [
      'inventory.item_created', 'inventory.item_updated', 'inventory.restocked',
      'inventory.consumed', 'inventory.item_deleted',
    ]);
  } finally {
    Stock.exists = originals.exists; Stock.create = originals.create;
    Stock.findOneAndUpdate = originals.update; Stock.findByIdAndDelete = originals.delete;
    AuditEvent.create = originals.audit;
  }
});

test('AuditEvent rejects mutation and deletion APIs before database execution', async () => {
  await assert.rejects(AuditEvent.updateOne({}, { $set: { action: 'changed' } }), /append-only/);
  await assert.rejects(AuditEvent.replaceOne({}, { action: 'changed' }), /append-only/);
  await assert.rejects(AuditEvent.findOneAndUpdate({}, { $set: { action: 'changed' } }), /append-only/);
  await assert.rejects(AuditEvent.deleteOne({}), /append-only/);
  await assert.rejects(AuditEvent.bulkWrite([{ deleteOne: { filter: {} } }]), /append-only/);
  const existing = new AuditEvent({ action: 'original', actor: { role: 'system' }, target: { type: 'test' } });
  existing.isNew = false;
  existing.action = 'changed';
  await assert.rejects(existing.save(), /append-only|immutable/);
  await assert.rejects(existing.deleteOne(), /append-only/);
});
