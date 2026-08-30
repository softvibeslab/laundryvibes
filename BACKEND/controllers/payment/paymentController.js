const Order = require('../../models/userOrder');
const mongoose = require('mongoose');
const {
  MAX_ORDER_TOTAL, MAX_PRICE_PER_KG, enabledMethod, getPaymentConfig, hasValidPricing,
} = require('../../services/paymentService');
const { validateEvidence } = require('../../middleware/evidenceUpload');
const { currentPayment, financialDto, recordForSource } = require('../../utils/orderDto');

async function recordPosPayment(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({ message: 'El identificador del pedido no es válido' });
    const method = enabledMethod(await getPaymentConfig(), req.body.paymentMethod);
    if (!method) return res.status(400).json({ message: 'El método de pago no está activo' });
    const evidence = validateEvidence(req.file);
    if (method.requiresEvidence && !evidence)
      return res.status(400).json({ message: 'Este método de pago requiere evidencia' });
    if (!method.requiresEvidence && evidence)
      return res.status(400).json({ message: 'El pago en efectivo no admite evidencia' });

    const candidate = await Order.findById(req.params.orderId);
    if (!candidate) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (req.user.role === 'worker' && String(candidate.assignedWorker || '') !== String(req.user.userId))
      return res.status(403).json({ message: 'Debes tener el pedido asignado para registrar el pago' });
    if (!hasValidPricing(candidate.pricing))
      return res.status(409).json({ message: 'El pedido no tiene un precio válido; regularízalo antes de registrar el pago' });

    const now = new Date();
    const record = {
      method: method.id, methodLabel: method.label, status: 'paid', source: 'pos',
      actorId: req.user.userId, actorRole: req.user.role, recordedAt: now,
      ...(evidence ? { evidence } : {}),
    };
    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.orderId,
        ...(candidate.assignedWorker ? { assignedWorker: candidate.assignedWorker } : { $or: [{ assignedWorker: null }, { assignedWorker: { $exists: false } }] }),
        'payment.current.status': { $ne: 'paid' },
        'payment.status': { $ne: 'paid' },
        'pricing.currency': 'MXN',
        'pricing.pricePerKg': { $gt: 0, $lte: MAX_PRICE_PER_KG },
        'pricing.total': { $gt: 0, $lte: MAX_ORDER_TOTAL },
      },
      { $set: {
        'payment.current.method': record.method,
        'payment.current.methodLabel': record.methodLabel,
        'payment.current.status': record.status,
        'payment.current.source': record.source,
        'payment.current.actorId': record.actorId,
        'payment.current.actorRole': record.actorRole,
        'payment.current.recordedAt': record.recordedAt,
        'payment.posRecord': record,
      } },
      { new: true, runValidators: true },
    );
    if (!order) {
      const existing = await Order.findById(req.params.orderId);
      if (!existing) return res.status(404).json({ message: 'Pedido no encontrado' });
      if (!hasValidPricing(existing.pricing))
        return res.status(409).json({ message: 'El pedido no tiene un precio válido; regularízalo antes de registrar el pago' });
      return res.status(409).json({ message: 'El pedido ya tiene un pago registrado' });
    }
    req.app.locals.io?.to('workers').emit('orders:refresh');
    req.app.locals.io?.to(`user:${order.userId}`).emit('orders:refresh');
    return res.json({ message: 'Pago registrado correctamente', order: { id: String(order._id), ...financialDto(order) } });
  } catch (error) { return next(error); }
}

async function getEvidence(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({ message: 'El identificador del pedido no es válido' });
    if (req.query.source && !['client', 'pos'].includes(req.query.source))
      return res.status(400).json({ message: 'El origen de evidencia no es válido' });
    const order = await Order.findById(req.params.orderId)
      .select('+payment.clientDeclaration.evidence.data +payment.posRecord.evidence.data');
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (req.user.role === 'user' && String(order.userId) !== String(req.user.userId))
      return res.status(403).json({ message: 'No tienes permisos suficientes' });
    const source = req.query.source || currentPayment(order)?.source;
    const evidence = recordForSource(order.payment, source)?.evidence
      || (source === currentPayment(order)?.source ? currentPayment(order)?.evidence : null);
    if (!evidence?.data || !evidence.contentType) return res.status(404).json({ message: 'El pedido no tiene evidencia para ese origen' });
    res.set({
      'Content-Type': evidence.contentType,
      'Content-Disposition': `inline; filename="evidencia-${source}.${evidence.extension}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    return res.send(evidence.data);
  } catch (error) { return next(error); }
}

module.exports = { getEvidence, recordPosPayment };
