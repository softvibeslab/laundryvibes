const { hasValidPricing } = require('../services/paymentService');

const PAYMENT_STATUS_LABELS = Object.freeze({
  pending: 'Pendiente', pending_review: 'Pendiente de revisión', paid: 'Pagado', unpaid: 'Sin pagar',
});

function currentPayment(order) {
  // The fallback keeps documents written by the pre-nested payment rollout readable.
  return order.payment?.current || (order.payment?.method ? order.payment : null);
}

function recordForSource(payment, source) {
  if (source === 'pos') return payment?.posRecord;
  if (source === 'client') return payment?.clientDeclaration;
  return null;
}

function financialDto(order) {
  const pricing = hasValidPricing(order.pricing) ? {
    currency: order.pricing.currency,
    pricePerKg: order.pricing.pricePerKg,
    total: order.pricing.total,
  } : null;
  const storedPayment = currentPayment(order);
  const status = storedPayment?.status || 'unpaid';
  const evidenceRecord = recordForSource(order.payment, storedPayment?.source) || storedPayment;
  const payment = storedPayment?.method ? {
    method: storedPayment.method,
    methodLabel: storedPayment.methodLabel,
    status,
    statusLabel: PAYMENT_STATUS_LABELS[status] || status,
    source: storedPayment.source,
    evidenceAvailable: Boolean(evidenceRecord?.evidence?.contentType),
    recordedAt: storedPayment.recordedAt,
  } : {
    method: null, methodLabel: null, status: 'unpaid', statusLabel: PAYMENT_STATUS_LABELS.unpaid,
    source: null, evidenceAvailable: false, recordedAt: null,
  };
  return { pricing, payment };
}

module.exports = { currentPayment, financialDto, recordForSource };
