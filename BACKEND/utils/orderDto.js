const { hasValidPricing } = require('../services/paymentService');

const PAYMENT_STATUS_LABELS = Object.freeze({
  pending: 'Pendiente', pending_review: 'Pendiente de revisión', paid: 'Pagado', unpaid: 'Sin pagar',
});

function currentPayment(order) {
  return order.payment?.current || (order.payment?.method ? order.payment : null);
}
function recordForSource(payment, source) {
  if (source === 'pos') return payment?.posRecord;
  if (source === 'client') return payment?.clientDeclaration;
  return null;
}
function financialDto(order) {
  const pricing = hasValidPricing(order.pricing) ? {
    currency: order.pricing.currency, pricePerKg: order.pricing.pricePerKg, total: order.pricing.total,
  } : null;
  const storedPayment = currentPayment(order);
  const status = storedPayment?.status || 'unpaid';
  const evidenceRecord = recordForSource(order.payment, storedPayment?.source) || storedPayment;
  const payment = storedPayment?.method ? {
    method: storedPayment.method, methodLabel: storedPayment.methodLabel, status,
    statusLabel: PAYMENT_STATUS_LABELS[status] || status, source: storedPayment.source,
    evidenceAvailable: Boolean(evidenceRecord?.evidence?.contentType), recordedAt: storedPayment.recordedAt,
  } : {
    method: null, methodLabel: null, status: 'unpaid', statusLabel: PAYMENT_STATUS_LABELS.unpaid,
    source: null, evidenceAvailable: false, recordedAt: null,
  };
  return { pricing, payment };
}

function orderDto(order, { includeTimeline = false } = {}) {
  const user = order.userId && typeof order.userId === 'object' ? order.userId : null;
  const worker = order.assignedWorker && typeof order.assignedWorker === 'object' ? order.assignedWorker : null;
  const id = String(order._id);
  const dto = {
    // Canonical names plus legacy aliases consumed by the current UI.
    id, orderId: id, OrderId: order._id,
    userId: user?._id ? String(user._id) : (order.userId ? String(order.userId) : null),
    userName: user?.name || 'N/A', clientName: user?.name || null,
    phoneNumber: user?.phoneNumber || null, bagNumber: user?.bagNumber || null,
    roomNumber: user?.roomNumber || null, buildingName: user?.buildingName || null,
    numberOfItems: order.numberOfClothes, numberOfClothes: order.numberOfClothes,
    weight: order.weight, status: order.status, createdAt: order.createdAt,
    assignedWorker: worker ? { id: String(worker._id), email: worker.email } : (order.assignedWorker ? { id: String(order.assignedWorker) } : null),
    assignedAt: order.assignedAt || null,
    ...financialDto(order),
  };
  if (order.createdAt) {
    dto.date = new Date(order.createdAt).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
    dto.time = new Date(order.createdAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
  }
  if (includeTimeline) dto.timeline = (order.timeline || []).map((event) => ({
    id: String(event._id), type: event.type, fromStatus: event.fromStatus || null,
    toStatus: event.toStatus || null,
    fromWorker: event.fromWorker ? String(event.fromWorker) : null,
    toWorker: event.toWorker ? String(event.toWorker) : null,
    actor: { id: String(event.actor?.id), role: event.actor?.role },
    comment: event.comment || null, origin: event.origin, timestamp: event.timestamp,
  }));
  return dto;
}

module.exports = { currentPayment, financialDto, orderDto, recordForSource };
