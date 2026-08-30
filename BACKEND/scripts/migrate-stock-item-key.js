#!/usr/bin/env node
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const { recordAudit } = require('../services/auditService');
const { runInTransaction } = require('../services/transactionService');
const { loadConfig } = require('../config/env');

const INDEX_NAME = 'stock_item_key_unique';
const INDEX_OPTIONS = Object.freeze({
  unique: true,
  partialFilterExpression: { itemKey: { $type: 'string' } },
  name: INDEX_NAME,
});

function analyzeDocuments(documents) {
  const groups = new Map();
  const updates = [];
  for (const document of documents) {
    const itemKey = Stock.normalizeStockIdentity(document.itemName);
    const ids = groups.get(itemKey) || [];
    ids.push(String(document._id));
    groups.set(itemKey, ids);
    if (document.itemKey !== itemKey) updates.push({ _id: document._id, itemKey });
  }
  const duplicates = [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([itemKey, ids]) => ({ itemKey, ids }));
  return { scanned: documents.length, updates, duplicates };
}

async function migrateStockItemKey({ dryRun = true, transactionRunner } = {}) {
  const documents = await Stock.find({}, { _id: 1, itemName: 1, itemKey: 1 }).lean();
  const analysis = analyzeDocuments(documents);
  const result = {
    dryRun,
    scanned: analysis.scanned,
    pendingBackfill: analysis.updates.length,
    duplicates: analysis.duplicates,
    index: INDEX_NAME,
  };
  if (dryRun) return result;
  if (analysis.duplicates.length) {
    const error = new Error('Duplicate normalized stock identities detected; reconcile them before applying the migration');
    error.code = 'STOCK_IDENTITY_DUPLICATES';
    error.duplicates = analysis.duplicates;
    throw error;
  }

  await Stock.collection.createIndex({ itemKey: 1 }, INDEX_OPTIONS);
  await runInTransaction(async (session) => {
    for (const update of analysis.updates) {
      await Stock.updateOne(
        { _id: update._id },
        { $set: { itemKey: update.itemKey } },
        { session, runValidators: true },
      );
    }
    await recordAudit({
      action: 'inventory.item_key_migrated',
      target: { type: 'stock_catalog', id: 'all' },
      actor: { role: 'system' },
      origin: { channel: 'cli' },
      metadata: { scanned: analysis.scanned, backfilled: analysis.updates.length },
      session,
    });
  }, { transactionRunner });
  return { ...result, backfilled: analysis.updates.length };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const dryRunFlag = process.argv.includes('--dry-run');
  if (apply === dryRunFlag) throw new Error('Choose exactly one mode: --dry-run or --apply');
  const config = loadConfig();
  await mongoose.connect(config.mongoUrl);
  try {
    const result = await migrateStockItemKey({ dryRun: !apply });
    console.info(JSON.stringify(result));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) main().catch((error) => {
  console.error('Stock itemKey migration failed', {
    name: error.name,
    message: error.message,
    duplicates: error.duplicates,
  });
  process.exitCode = 1;
});

module.exports = { migrateStockItemKey, analyzeDocuments, INDEX_NAME, INDEX_OPTIONS };
