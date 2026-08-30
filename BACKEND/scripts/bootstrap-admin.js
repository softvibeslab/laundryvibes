#!/usr/bin/env node
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Worker = require('../models/Worker/workerModel');
const User = require('../models/user');
const { normalizeEmail, isValidEmail, isValidPassword } = require('../utils/credentials');
const { recordAudit } = require('../services/auditService');
const { loadConfig } = require('../config/env');
const { runInTransaction } = require('../services/transactionService');

async function bootstrapAdmin({ email, password, dryRun = false, transactionRunner } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail) || !isValidPassword(password)) {
    throw new Error('ADMIN_EMAIL must be valid and ADMIN_PASSWORD must contain at least 8 characters');
  }
  const existing = (await Worker.findOne({ email: normalizedEmail }).select('role active'))
    || (await User.findOne({ email: normalizedEmail }).select('role active'));
  if (existing) {
    if (existing.role !== 'admin') throw new Error('Email belongs to a non-admin operational account');
    return { created: false, dryRun, id: String(existing._id) };
  }
  if (dryRun) return { created: false, dryRun: true };
  try {
    const hashedPassword = await bcrypt.hash(String(password), 12);
    const admin = await runInTransaction(async (session) => {
      const result = await Worker.create([{
        email: normalizedEmail,
        password: hashedPassword,
        role: 'admin', active: true, tokenVersion: 0,
      }], { session });
      const created = Array.isArray(result) ? result[0] : result;
      await recordAudit({
        action: 'account.admin_bootstrapped', target: { type: 'account', id: String(created._id) },
        actor: { role: 'system' }, origin: { channel: 'cli' }, session,
      });
      return created;
    }, { transactionRunner });
    return { created: true, dryRun: false, id: String(admin._id) };
  } catch (error) {
    if (error?.code === 11000) return bootstrapAdmin({ email: normalizedEmail, password, dryRun: false, transactionRunner });
    throw error;
  }
}

async function main() {
  const config = loadConfig();
  await mongoose.connect(config.mongoUrl);
  try {
    const result = await bootstrapAdmin({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      dryRun: process.argv.includes('--dry-run'),
    });
    // Deliberately omit email and all credential material.
    console.info(result.dryRun ? 'Bootstrap validation complete (dry run)' : (result.created ? 'Administrator created' : 'Administrator already exists'));
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) main().catch((error) => {
  console.error('Administrator bootstrap failed', { name: error.name, message: error.message });
  process.exitCode = 1;
});

module.exports = { bootstrapAdmin };
