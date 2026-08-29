const PaymentConfig = require('../models/paymentConfig');

const METHOD_DEFINITIONS = Object.freeze({
  cash: Object.freeze({ label: 'Efectivo', requiresEvidence: false }),
  transfer: Object.freeze({ label: 'Transferencia', requiresEvidence: true }),
  card: Object.freeze({ label: 'Tarjeta', requiresEvidence: true }),
});
const DEFAULT_METHODS = Object.freeze(Object.keys(METHOD_DEFINITIONS).map((id) => ({ id, enabled: true })));
const COMING_SOON = Object.freeze(['PayPal', 'Mercado Pago', 'Stripe']);

// Operational limits also keep every monetary intermediate a safe integer.
const MAX_PRICE_PER_KG = 10_000;
const MAX_WEIGHT_KG = 1_000;
const MAX_NUMBER_OF_CLOTHES = 10_000;
const MAX_ORDER_TOTAL = 10_000_000;
const MAX_PRICE_CENTS = MAX_PRICE_PER_KG * 100;
const MAX_TOTAL_CENTS = MAX_ORDER_TOTAL * 100;

async function getPaymentConfig() {
  return PaymentConfig.findOneAndUpdate(
    { _id: 'global' },
    { $setOnInsert: { currency: 'MXN', locale: 'es-MX', pricePerKg: 60, methods: DEFAULT_METHODS } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
}

function configDto(config) {
  const enabledById = new Map((config.methods || []).map((method) => [method.id, method.enabled]));
  return {
    currency: config.currency,
    locale: config.locale,
    pricePerKg: config.pricePerKg,
    methods: Object.entries(METHOD_DEFINITIONS).map(([id, definition]) => ({
      id,
      label: definition.label,
      enabled: enabledById.get(id) === true,
      requiresEvidence: definition.requiresEvidence,
    })),
    comingSoon: [...COMING_SOON],
  };
}

function parseMethods(value) {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const methods = [];
  const seen = new Set();
  for (const item of value) {
    if (!item || typeof item !== 'object' || !METHOD_DEFINITIONS[item.id] || typeof item.enabled !== 'boolean' || seen.has(item.id)) return null;
    seen.add(item.id);
    methods.push({ id: item.id, enabled: item.enabled });
  }
  if (seen.size !== 3 || !methods.some((method) => method.enabled)) return null;
  return Object.keys(METHOD_DEFINITIONS).map((id) => methods.find((method) => method.id === id));
}

// Parses decimal input as text, avoiding floating-point decimal-place checks.
function parsePrice(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > MAX_PRICE_CENTS) return null;
  return { cents, value: cents / 100 };
}

function parseWeight(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const thousandths = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  if (!Number.isSafeInteger(thousandths) || thousandths < 1 || thousandths > MAX_WEIGHT_KG * 1000) return null;
  return { thousandths, value: thousandths / 1000 };
}

function parseClothes(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value);
  if (!/^[1-9]\d*$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed <= MAX_NUMBER_OF_CLOTHES ? parsed : null;
}

function calculateTotal(weight, pricePerKg) {
  const parsedWeight = parseWeight(weight);
  const parsedPrice = parsePrice(pricePerKg);
  if (!parsedWeight || !parsedPrice) return null;
  const product = parsedWeight.thousandths * parsedPrice.cents;
  if (!Number.isSafeInteger(product)) return null;
  const totalCents = Math.round(product / 1000);
  if (!Number.isSafeInteger(totalCents) || totalCents < 1 || totalCents > MAX_TOTAL_CENTS) return null;
  return totalCents / 100;
}

function isMoneyValue(value, maximum) {
  if (!Number.isFinite(value) || value <= 0 || value > maximum) return false;
  const text = String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) return false;
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents <= MAX_TOTAL_CENTS;
}

function hasValidPricing(pricing) {
  return Boolean(
    pricing && pricing.currency === 'MXN'
    && Number.isFinite(pricing.pricePerKg) && parsePrice(pricing.pricePerKg)
    && isMoneyValue(pricing.total, MAX_ORDER_TOTAL),
  );
}

function enabledMethod(config, id) {
  const definition = METHOD_DEFINITIONS[id];
  if (!definition || !(config.methods || []).some((method) => method.id === id && method.enabled)) return null;
  return { id, ...definition };
}

module.exports = {
  METHOD_DEFINITIONS, MAX_NUMBER_OF_CLOTHES, MAX_ORDER_TOTAL, MAX_PRICE_PER_KG, MAX_WEIGHT_KG,
  calculateTotal, configDto, enabledMethod, getPaymentConfig, hasValidPricing, parseClothes, parseMethods,
  parsePrice, parseWeight,
};
