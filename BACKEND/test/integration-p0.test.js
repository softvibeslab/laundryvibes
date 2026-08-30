const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const AuditEvent = require('../models/auditEvent');
const stockController = require('../controllers/worker/stockController');

const mongoUrl = process.env.TEST_MONGODB_URL;

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function requestFor(id, body) {
  return {
    body,
    params: { id: String(id) },
    user: { userId: '507f1f77bcf86cd799439012', role: 'worker' },
    ip: '127.0.0.1',
    get: () => 'integration-test',
    app: { locals: { config: {} } },
  };
}

async function invoke(controller, req) {
  const res = response();
  await controller(req, res, (error) => { if (error) throw error; });
  return res;
}

test('inventory transactions preserve concurrent quantities and audit events in real MongoDB', { skip: !mongoUrl }, async () => {
  await mongoose.connect(mongoUrl);
  try {
    await Promise.all([Stock.deleteMany({}), AuditEvent.deleteMany({}).catch(() => {})]);
    // AuditEvent intentionally blocks model deletes; use the native collection only in this isolated test DB.
    await AuditEvent.collection.deleteMany({});
    await Stock.collection.createIndex(
      { itemKey: 1 },
      { unique: true, partialFilterExpression: { itemKey: { $type: 'string' } }, name: 'stock_item_key_unique' },
    );

    const stock = await Stock.create({
      itemName: 'Soap', itemKey: 'soap', currentQuantity: 5, reorderLevel: 1, unit: 'Kg',
    });

    const consumptionResults = await Promise.all([
      invoke(stockController.recordConsumption, requestFor(stock._id, { quantityUsed: 4, reason: '$literal-check' })),
      invoke(stockController.recordConsumption, requestFor(stock._id, { quantityUsed: 4, reason: '$literal-check' })),
    ]);
    assert.deepEqual(consumptionResults.map((result) => result.statusCode).sort(), [200, 409]);

    let persisted = await Stock.findById(stock._id).lean();
    assert.equal(persisted.currentQuantity, 1);
    assert.equal(persisted.consumptionHistory.length, 1);
    assert.equal(persisted.consumptionHistory[0].reason, '$literal-check');
    assert.ok(persisted.consumptionHistory[0]._id);
    assert.equal(await AuditEvent.countDocuments({ action: 'inventory.consumed' }), 1);

    const restockResults = await Promise.all([
      invoke(stockController.addStock, requestFor(stock._id, { quantityToAdd: 2, notes: '$itemName' })),
      invoke(stockController.addStock, requestFor(stock._id, { quantityToAdd: 2, notes: '$itemName' })),
    ]);
    assert.deepEqual(restockResults.map((result) => result.statusCode), [200, 200]);

    persisted = await Stock.findById(stock._id).lean();
    assert.equal(persisted.currentQuantity, 5);
    assert.equal(persisted.notes, '$itemName');
    assert.equal(await AuditEvent.countDocuments({ action: 'inventory.restocked' }), 2);
  } finally {
    await mongoose.disconnect();
  }
});
