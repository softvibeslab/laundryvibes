const User = require('../models/user');
const Worker = require('../models/Worker/workerModel');

const versionOf = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : 0);

async function findAccountForClaims(claims) {
  const primary = claims.role === 'user' ? User : Worker;
  const fallback = claims.role === 'user' ? Worker : User;
  const account = await primary.findById(claims.userId).select('role active tokenVersion');
  if (account) return account;
  return fallback.findById(claims.userId).select('role active tokenVersion');
}

function accountMatchesClaims(account, claims) {
  return Boolean(
    account
    && account.active !== false
    && account.role === claims.role
    && versionOf(account.tokenVersion) === versionOf(claims.tokenVersion),
  );
}

module.exports = { findAccountForClaims, accountMatchesClaims, versionOf };
