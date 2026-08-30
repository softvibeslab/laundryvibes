const MAX_STOCK_QUANTITY = 1_000_000;
const STOCK_DECIMALS = 3;

function parseStockQuantity(value, { allowZero = false } = {}) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number > MAX_STOCK_QUANTITY) return null;
  if (allowZero ? number < 0 : number <= 0) return null;
  const scale = 10 ** STOCK_DECIMALS;
  if (!Number.isSafeInteger(Math.round(number * scale)) || Math.abs(Math.round(number * scale) - number * scale) > 1e-8) return null;
  return number;
}

function isStockQuantity(value, { allowZero = true } = {}) {
  return parseStockQuantity(value, { allowZero }) !== null;
}

module.exports = { parseStockQuantity, isStockQuantity, MAX_STOCK_QUANTITY, STOCK_DECIMALS };
