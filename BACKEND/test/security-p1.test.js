const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
const { loadConfig } = require('../config/env');
const Stock = require('../models/Stock');
const AuditEvent = require('../models/auditEvent');
const stockController = require('../controllers/worker/stockController');
const { analyzeDocuments, migrateStockItemKey, INDEX_NAME } = require('../scripts/migrate-stock-item-key');

const session = { id: 'injected-session' };
const req = (body = {}) => ({
  body,
  params: { id: '507f1f77bcf86cd799439011' },
  user: { userId: '507f1f77bcf86cd799439012', role: 'worker' },
  ip: '127.0.0.1',
  get: () => 'test-agent',
  app: { locals: { config: { transactionRunner: async (work) => work(session) } } },
});
function response() {
  return {
    statusCode: 200, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
const next = (error) => { if (error) throw error; };

test('stock schema and parser share decimal validation', async () => {
  assert.equal(Stock.finiteQuantity(1.001), true);
  assert.equal(Stock.finiteQuantity(1.0001), false);
  const valid = new Stock({ itemName: 'Soap', currentQuantity: 1.001, reorderLevel: 0 });
  await valid.validate();
  const invalid = new Stock({ itemName: 'Soap', currentQuantity: 1.0001, reorderLevel: 0 });
  await assert.rejects(invalid.validate(), /at most 3 decimals/);
});

test('stock update rejects empty and unknown payloads before persistence', async () => {
  const original = Stock.findOneAndUpdate;
  let calls = 0;
  Stock.findOneAndUpdate = async () => { calls += 1; };
  try {
    for (const body of [{}, { status: 'High' }, { notes: 'ok', unexpected: true }]) {
      const res = response();
      await stockController.updateStockItem(req(body), res, next);
      assert.equal(res.statusCode, 400);
    }
    assert.equal(calls, 0);
  } finally { Stock.findOneAndUpdate = original; }
});

test('legacy stock names are considered duplicates before itemKey backfill', async () => {
  const originals = { exists: Stock.exists, create: Stock.create };
  let filter;
  Stock.exists = async (value) => { filter = value; return true; };
  Stock.create = async () => { throw new Error('must not create'); };
  try {
    const res = response();
    await stockController.createStockItem(req({ itemName: 'Fabric Softener', currentQuantity: 1 }), res, next);
    assert.equal(res.statusCode, 409);
    assert.equal(filter.$or[0].itemKey, 'fabric softener');
    assert.equal(filter.$or[1].itemName.test('  FABRIC   SOFTENER '), true);
  } finally { Stock.exists = originals.exists; Stock.create = originals.create; }
});

test('pipeline user strings are literal and generated subdocuments have ObjectIds', async () => {
  const originals = { update: Stock.findOneAndUpdate, audit: AuditEvent.create };
  const pipelines = [];
  Stock.findOneAndUpdate = async (_filter, pipeline, options) => {
    pipelines.push({ pipeline, options });
    return { _id: req().params.id, alerts: [] };
  };
  AuditEvent.create = async (event, options) => ({ event, options });
  try {
    await stockController.addStock(req({ quantityToAdd: 1, notes: '$currentQuantity' }), response(), next);
    await stockController.recordConsumption(req({ quantityUsed: 1, reason: '$itemName' }), response(), next);
    await stockController.updateStockItem(req({ notes: '$reorderLevel' }), response(), next);

    assert.deepEqual(pipelines[0].pipeline[0].$set.notes, { $literal: '$currentQuantity' });
    const historyLiteral = pipelines[1].pipeline[0].$set.consumptionHistory.$concatArrays[1][0].$literal;
    assert.equal(historyLiteral.reason, '$itemName');
    assert.equal(historyLiteral._id.constructor.name, 'ObjectId');
    const alert = pipelines[1].pipeline[1].$set.alerts.$let.in.$concatArrays[1].$cond[1][0];
    assert.equal(alert._id.constructor.name, 'ObjectId');
    assert.deepEqual(pipelines[2].pipeline[0].$set.notes, { $literal: '$reorderLevel' });
    assert.equal(pipelines.every(({ options }) => options.session === session), true);
  } finally { Stock.findOneAndUpdate = originals.update; AuditEvent.create = originals.audit; }
});

test('itemKey migration reports duplicates in dry-run without writes', async () => {
  const originals = { find: Stock.find, update: Stock.updateOne, createIndex: Stock.collection.createIndex };
  let writes = 0;
  Stock.find = () => ({ lean: async () => [
    { _id: '1', itemName: ' Soap ' },
    { _id: '2', itemName: 'soap', itemKey: 'soap' },
  ] });
  Stock.updateOne = async () => { writes += 1; };
  Stock.collection.createIndex = async () => { writes += 1; };
  try {
    const result = await migrateStockItemKey({ dryRun: true });
    assert.equal(result.pendingBackfill, 1);
    assert.deepEqual(result.duplicates, [{ itemKey: 'soap', ids: ['1', '2'] }]);
    assert.equal(writes, 0);
    await assert.rejects(migrateStockItemKey({ dryRun: false, transactionRunner: async (work) => work(session) }), (error) => error.code === 'STOCK_IDENTITY_DUPLICATES');
    assert.equal(writes, 0);
  } finally { Stock.find = originals.find; Stock.updateOne = originals.update; Stock.collection.createIndex = originals.createIndex; }
});

test('itemKey migration creates only its explicit index and backfills with audit in one injected transaction', async () => {
  const originals = { find: Stock.find, update: Stock.updateOne, createIndex: Stock.collection.createIndex, audit: AuditEvent.create };
  const calls = [];
  Stock.find = () => ({ lean: async () => [{ _id: '1', itemName: 'Soap' }] });
  Stock.collection.createIndex = async (keys, options) => calls.push({ type: 'index', keys, options });
  Stock.updateOne = async (_filter, update, options) => calls.push({ type: 'update', update, options });
  AuditEvent.create = async (event, options) => {
    const document = Array.isArray(event) ? event[0] : event;
    calls.push({ type: 'audit', event: document, options });
    return Array.isArray(event) ? [document] : document;
  };
  try {
    const result = await migrateStockItemKey({ dryRun: false, transactionRunner: async (work) => work(session) });
    assert.equal(result.backfilled, 1);
    assert.equal(calls[0].type, 'index');
    assert.equal(calls[0].options.name, INDEX_NAME);
    assert.deepEqual(calls[1].update, { $set: { itemKey: 'soap' } });
    assert.equal(calls[1].options.session, session);
    assert.equal(calls[2].event.action, 'inventory.item_key_migrated');
    assert.equal(calls[2].options.session, session);
  } finally { Stock.find = originals.find; Stock.updateOne = originals.update; Stock.collection.createIndex = originals.createIndex; AuditEvent.create = originals.audit; }
});

test('rate limit environment is parsed and write limiter skips GET', async () => {
  const parsed = loadConfig({
    NODE_ENV: 'test', MONGODB_URL: 'mongodb://example/test', JWT_SECRET: 'x', FRONTEND_URL: 'https://app.example.com',
    LOGIN_RATE_LIMIT: '7', RESET_RATE_LIMIT: '8', WRITE_RATE_LIMIT: '1',
  });
  assert.equal(parsed.loginRateLimit, 7);
  assert.equal(parsed.resetRateLimit, 8);
  assert.equal(parsed.writeRateLimit, 1);
  assert.throws(() => loadConfig({
    NODE_ENV: 'test', MONGODB_URL: 'mongodb://example/test', JWT_SECRET: 'x', FRONTEND_URL: 'https://app.example.com', WRITE_RATE_LIMIT: '0',
  }), /positive integer/);

  const app = createApp({ ...parsed, accountLookup: async () => null });
  for (let index = 0; index < 3; index += 1) {
    assert.equal((await request(app).get('/api/stock')).status, 401);
  }
  assert.equal((await request(app).post('/api/stock').send({})).status, 401);
  assert.equal((await request(app).post('/api/stock').send({})).status, 429);
});

test('analyzeDocuments normalizes whitespace and identifies pending updates', () => {
  assert.deepEqual(analyzeDocuments([{ _id: 1, itemName: ' Fabric   Softener ', itemKey: 'wrong' }]), {
    scanned: 1,
    updates: [{ _id: 1, itemKey: 'fabric softener' }],
    duplicates: [],
  });
});
