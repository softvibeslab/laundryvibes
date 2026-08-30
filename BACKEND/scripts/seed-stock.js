#!/usr/bin/env node
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const { recordAudit } = require('../services/auditService');
const { loadConfig } = require('../config/env');
const { runInTransaction } = require('../services/transactionService');

const DEFAULT_STOCK = Object.freeze([
  { itemName: 'Detergent', currentQuantity: 50, unit: 'Liters', reorderLevel: 10 },
  { itemName: 'Fabric Softener', currentQuantity: 30, unit: 'Liters', reorderLevel: 8 },
  { itemName: 'Soap', currentQuantity: 40, unit: 'Kg', reorderLevel: 10 },
  { itemName: 'Bleach', currentQuantity: 20, unit: 'Liters', reorderLevel: 5 },
  { itemName: 'Starch', currentQuantity: 25, unit: 'Kg', reorderLevel: 5 },
]);

const legacyNamePattern = (itemName) => new RegExp(`^\\s*${itemName.split(/\s+/).join('\\s+')}\\s*$`, 'i');

async function seedStock({ dryRun = false, transactionRunner } = {}) {
  const keys = DEFAULT_STOCK.map(({ itemName }) => Stock.normalizeStockIdentity(itemName));
  const existing = await Stock.countDocuments({ $or: [{ itemKey: { $in: keys } }, { itemName: { $in: DEFAULT_STOCK.map((item) => item.itemName) } }] });
  if (dryRun) return { existing, candidates: DEFAULT_STOCK.length, dryRun: true };
  const created = await runInTransaction(async (session) => {
    let count = 0;
    for (const item of DEFAULT_STOCK) {
      const itemKey = Stock.normalizeStockIdentity(item.itemName);
      const result = await Stock.updateOne(
        { $or: [{ itemKey }, { itemName: legacyNamePattern(item.itemName) }] },
        { $set: { itemKey }, $setOnInsert: item },
        { upsert: true, runValidators: true, session },
      );
      if (result.upsertedCount) count += 1;
    }
    await recordAudit({
      action: 'inventory.seeded', target: { type: 'stock_catalog', id: 'default' },
      actor: { role: 'system' }, origin: { channel: 'cli' }, metadata: { created: count }, session,
    });
    return count;
  }, { transactionRunner });
  return { existing, created, candidates: DEFAULT_STOCK.length, dryRun: false };
}

async function main() {
  const config = loadConfig();
  await mongoose.connect(config.mongoUrl);
  try {
    const result = await seedStock({ dryRun: process.argv.includes('--dry-run') });
    console.info(`Inventory seed complete: candidates=${result.candidates} existing=${result.existing} created=${result.created || 0} dryRun=${result.dryRun}`);
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) main().catch((error) => {
  console.error('Inventory seed failed', { name: error.name, message: error.message });
  process.exitCode = 1;
});

module.exports = { seedStock, DEFAULT_STOCK };
