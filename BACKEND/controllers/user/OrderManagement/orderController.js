const mongoose = require('mongoose');
const Order = require('../../../models/userOrder');
const {
  calculateTotal, enabledMethod, getPaymentConfig, parseClothes, parsePrice, parseWeight,
} = require('../../../services/paymentService');
const { validateEvidence } = require('../../../middleware/evidenceUpload');
const { financialDto, orderDto } = require('../../../utils/orderDto');

async function submitOrder(req, res, next) {
  const numberOfClothes = parseClothes(req.body.numberOfClothes);
  const parsedWeight = parseWeight(req.body.weight);
  if (!numberOfClothes)
    return res.status(400).json({ message: 'El número de prendas debe ser un entero positivo dentro del máximo permitido' });
  if (!parsedWeight)
    return res.status(400).json({ message: 'El peso debe ser positivo, finito y estar dentro del máximo permitido' });

  try {
    const config = await getPaymentConfig();
    const parsedPrice = parsePrice(config?.pricePerKg);
    const total = parsedPrice ? calculateTotal(parsedWeight.value, parsedPrice.value) : null;
    if (!parsedPrice || !Number.isFinite(total))
      return res.status(409).json({ message: 'La tarifa vigente no es válida; solicita su regularización' });
    const method = enabledMethod(config, req.body.paymentMethod);
    if (!method) return res.status(400).json({ message: 'El método de pago no está activo' });
    const evidence = validateEvidence(req.file);
    if (method.requiresEvidence && !evidence)
      return res.status(400).json({ message: 'Este método de pago requiere evidencia' });
    if (!method.requiresEvidence && evidence)
      return res.status(400).json({ message: 'El pago en efectivo no admite evidencia' });

    const now = new Date();
    const newOrder = await Order.create({
      userId: req.user.userId,
      numberOfClothes,
      weight: parsedWeight.value,
      pricing: {
        currency: config.currency,
        pricePerKg: parsedPrice.value,
        total,
      },
      payment: { current: {
        method: method.id,
        methodLabel: method.label,
        status: method.requiresEvidence ? 'pending_review' : 'pending',
        source: 'client',
        actorId: req.user.userId,
        actorRole: 'user',
        recordedAt: now,
      }, clientDeclaration: {
        method: method.id, methodLabel: method.label,
        status: method.requiresEvidence ? 'pending_review' : 'pending', source: 'client',
        actorId: req.user.userId, actorRole: 'user', recordedAt: now,
        ...(evidence ? { evidence } : {}),
      } },
      timeline: [{
        type: 'created', toStatus: 'Pending', actor: { id: req.user.userId, role: 'user' },
        comment: typeof req.body.comment === 'string' ? req.body.comment.trim().slice(0, 1000) : undefined,
        origin: ['web', 'api'].includes(req.body.origin) ? req.body.origin : 'api', timestamp: now,
      }],
    });
    req.app.locals.io?.to('workers').emit('orders:refresh');
    return res.status(201).json({ message: 'Pedido enviado correctamente', order: orderDto(newOrder) });
  } catch (error) { return next(error); }
}

async function getOrderSummary(req, res, next) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      return res.json({ totalOrders: 0, lengthOfPending: 0, lengthOfComplete: 0, order: [] });
    }
    const formattedOrders = orders.map((order) => ({
      orderId: order._id,
      numberOfClothes: order.numberOfClothes,
      weight: order.weight,
      status: order.status,
      createdAt: order.createdAt,
      ...financialDto(order),
    }));
    return res.json({
      totalOrders: orders.length,
      lengthOfPending: orders.filter((order) => order.status === 'Pending').length,
      lengthOfComplete: orders.filter((order) => order.status === 'Completed').length,
      order: formattedOrders,
    });
  } catch (error) { return next(error); }
}

module.exports = { getOrderSummary, orderDto, submitOrder };
