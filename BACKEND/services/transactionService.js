const mongoose = require('mongoose');

async function runInTransaction(work, { transactionRunner } = {}) {
  if (transactionRunner) return transactionRunner(work);
  return mongoose.connection.transaction((session) => work(session));
}

function transactionOptions(session) {
  return session ? { session } : {};
}

module.exports = { runInTransaction, transactionOptions };
