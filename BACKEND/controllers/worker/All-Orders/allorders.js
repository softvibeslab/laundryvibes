const mongoose = require('mongoose');
const Order = require('../../../models/userOrder');
const User = require('../../../models/user');
const { orderDto } = require('../../../utils/orderDto');
const { recordAudit } = require('../../../services/auditService');
const {
  STATES, WorkflowError, assign, reopen, transition, validId,
} = require('../../../services/orderStateService');

const PAYMENT_STATES = ['pending', 'pending_review', 'paid', 'unpaid'];
const PROFILE_MATCH_LIMIT = 500;
const SMS_LEASE_MS = 2 * 60 * 1000;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function queryError(message) { return new WorkflowError(400, message, 'INVALID_FILTER'); }
function textFilter(value, name) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) throw queryError(`El filtro ${name} no es válido`);
  return new RegExp(escapeRegex(value.trim()), 'i');
}
function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 25 : Number(query.limit);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw queryError('La paginación no es válida');
  return { page, limit };
}
function parseDate(value, end = false) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) throw queryError('El rango de fecha no es válido');
  const date = new Date(value.length === 10 ? `${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z` : value);
  if (Number.isNaN(date.getTime())) throw queryError('El rango de fecha no es válido');
  return date;
}

function paymentStatusFilter(status) {
  const currentPath = 'payment.current.status';
  const legacyPath = 'payment.status';
  const legacyFallback = status === 'unpaid'
    ? { $or: [{ [legacyPath]: 'unpaid' }, { [legacyPath]: { $exists: false } }, { [legacyPath]: null }] }
    : { [legacyPath]: status };
  return {
    $or: [
      { [currentPath]: status },
      { $and: [{ [currentPath]: { $exists: false } }, legacyFallback] },
    ],
  };
}

async function buildFilter(req) {
  const filter = {};
  if (req.user.role === 'user') filter.userId = req.user.userId;
  if (req.query.status !== undefined) {
    const statuses = String(req.query.status).split(',');
    if (!statuses.length || statuses.some((status) => !STATES.includes(status))) throw queryError('El filtro de estado no es válido');
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }
  if (req.query.paymentStatus !== undefined || req.query.payment !== undefined) {
    const payment = req.query.paymentStatus || req.query.payment;
    if (!PAYMENT_STATES.includes(payment)) throw queryError('El filtro de pago no es válido');
    filter.$and = [...(filter.$and || []), paymentStatusFilter(payment)];
  }
  if (req.query.workerId !== undefined) {
    if (!validId(req.query.workerId)) throw queryError('El filtro de trabajador no es válido');
    filter.assignedWorker = req.query.workerId;
  }
  const from = parseDate(req.query.dateFrom); const to = parseDate(req.query.dateTo, true);
  if (from || to) {
    if (from && to && from > to) throw queryError('El rango de fecha no es válido');
    filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  }
  const userSearch = {};
  const mappings = [['bagNumber', 'bagNumber'], ['client', 'name'], ['phone', 'phoneNumber'], ['room', 'roomNumber']];
  for (const [queryName, field] of mappings) {
    const regex = textFilter(req.query[queryName], queryName);
    if (regex) userSearch[field] = regex;
  }
  if (Object.keys(userSearch).length) {
    if (req.user.role === 'user') {
      const ownProfile = await User.findOne({ _id: req.user.userId, ...userSearch }).select('_id').lean();
      if (!ownProfile) filter._id = { $exists: false };
      return filter;
    }
    const users = await User.find(userSearch).select('_id').limit(PROFILE_MATCH_LIMIT + 1).lean();
    if (users.length > PROFILE_MATCH_LIMIT)
      throw new WorkflowError(422, `La búsqueda coincide con más de ${PROFILE_MATCH_LIMIT} perfiles; agrega filtros`, 'FILTER_TOO_BROAD');
    const ids = users.map((user) => user._id);
    filter.userId = { $in: ids };
  }
  return filter;
}

async function listOrders(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query);
    const filter = await buildFilter(req);
    const [orders, total] = await Promise.all([
      Order.find(filter).populate('userId', 'name phoneNumber bagNumber roomNumber buildingName')
        .populate('assignedWorker', 'email active').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(filter),
    ]);
    const items = orders.map((order) => orderDto(order));
    const response = { items, orders: items, page, limit, total, totalPages: Math.ceil(total / limit) };
    // Legacy counters remain available but refer to this page; canonical consumers use total/items.
    response.totalOrders = total;
    response.pendingOrders = items.filter((o) => o.status === 'Pending').length;
    response.completedOrders = items.filter((o) => o.status === 'Completed').length;
    return res.json(response);
  } catch (error) { return next(error); }
}

async function getOrderDetail(req, res, next) {
  try {
    if (!validId(req.params.orderId)) return res.status(400).json({ message: 'El identificador del pedido no es válido' });
    const order = await Order.findById(req.params.orderId)
      .populate('userId', 'name phoneNumber bagNumber roomNumber buildingName')
      .populate('assignedWorker', 'email active');
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    const owner = order.userId?._id || order.userId;
    if (req.user.role === 'user' && String(owner) !== String(req.user.userId))
      return res.status(403).json({ message: 'No tienes permisos suficientes' });
    return res.json({ order: orderDto(order, { includeTimeline: true }) });
  } catch (error) { return next(error); }
}

async function notifyCompleted(req, order) {
  if (order.status !== 'Completed' || !order.completionNotification?.transitionEventId) return 'not-applicable';
  const configuredSender = req.app.locals.smsSender;
  const configured = configuredSender || (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
  if (!configured) return 'not-configured';
  const eventId = order.completionNotification.transitionEventId;
  const now = new Date(); const claimToken = new mongoose.Types.ObjectId();
  const leaseExpiresAt = new Date(now.getTime() + SMS_LEASE_MS);
  const ownershipFilter = req.user?.role === 'worker' ? { assignedWorker: req.user.userId } : {};
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, status: 'Completed', ...ownershipFilter, 'completionNotification.transitionEventId': eventId, $or: [
      { 'completionNotification.status': { $in: ['pending', 'failed'] } },
      { 'completionNotification.status': 'sending', 'completionNotification.leaseExpiresAt': { $lte: now } },
    ] },
    { $set: { 'completionNotification.status': 'sending', 'completionNotification.claimedAt': now, 'completionNotification.lastAttemptAt': now, 'completionNotification.leaseExpiresAt': leaseExpiresAt, 'completionNotification.claimToken': claimToken }, $inc: { 'completionNotification.attempts': 1 } },
    { new: true },
  ).populate('userId', 'phoneNumber');
  if (!claimed) {
    const current = await Order.findById(order._id).select('assignedWorker completionNotification.status completionNotification.leaseExpiresAt');
    if (req.user?.role === 'worker' && String(current?.assignedWorker || '') !== String(req.user.userId)) return 'assignment-changed';
    return current?.completionNotification?.status === 'sending' ? 'in-progress' : 'already-sent';
  }
  const finish = async (status, comment, extra = {}) => {
    const timestamp = new Date();
    const result = await Order.updateOne(
      { _id: order._id, 'completionNotification.transitionEventId': eventId, 'completionNotification.status': 'sending', 'completionNotification.claimToken': claimToken },
      { $set: { 'completionNotification.status': status, ...extra }, $unset: { 'completionNotification.claimToken': 1, 'completionNotification.leaseExpiresAt': 1 }, $push: { timeline: { type: 'notification', actor: { id: req.user?.userId || order.userId, role: req.user?.role || 'system' }, comment, origin: 'system', timestamp } } },
    );
    if (result.modifiedCount) await recordAudit({ action: `order.notification.${status}`, target: { type: 'order', id: String(order._id) }, actor: { id: req.user?.userId, role: req.user?.role || 'system' }, origin: { channel: 'http' }, metadata: { eventId: String(eventId), claimToken: String(claimToken) } });
    return Boolean(result.modifiedCount);
  };
  const phone = claimed.userId?.phoneNumber;
  if (!phone) {
    return await finish('failed', 'Notificación SMS fallida: teléfono no disponible') ? 'failed' : 'lease-lost';
  }
  try {
    const send = configuredSender || ((payload) => require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN).messages.create(payload));
    await send({ body: `LaundryVibes: tu pedido ${order._id} está completo y listo.`, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
    return await finish('sent', 'Notificación SMS enviada', { 'completionNotification.sentAt': new Date(), smsSent: true }) ? 'sent' : 'lease-lost';
  } catch (error) {
    const finalized = await finish('failed', 'Notificación SMS fallida; se puede reintentar');
    console.error('Best-effort SMS failed', { orderId: String(order._id), name: error.name });
    return finalized ? 'failed' : 'lease-lost';
  }
}

function emitRefresh(req, order) {
  req.app.locals.io?.to('workers').emit('orders:refresh');
  const userId = order.userId?._id || order.userId;
  if (userId) req.app.locals.io?.to(`user:${userId}`).emit('orders:refresh');
}
async function transitionOrder(req, res, next) {
  try {
    const order = await transition(req);
    emitRefresh(req, order);
    const notification = order.status === 'Completed' ? await notifyCompleted(req, order) : 'not-applicable';
    return res.json({ message: 'Estado del pedido actualizado', order: orderDto(order, { includeTimeline: true }), notification });
  } catch (error) { return next(error); }
}
async function updateOrderStatus(req, res, next) {
  try {
    const order = await transition(req, { legacyCompleted: true });
    emitRefresh(req, order);
    const notification = await notifyCompleted(req, order);
    return res.json({ message: 'Estado del pedido actualizado', order: orderDto(order), notification });
  } catch (error) { return next(error); }
}
async function assignOrder(req, res, next) {
  try { const order = await assign(req); emitRefresh(req, order); return res.json({ message: 'Pedido asignado', order: orderDto(order, { includeTimeline: true }) }); }
  catch (error) { return next(error); }
}
async function reopenOrder(req, res, next) {
  try { const order = await reopen(req); emitRefresh(req, order); return res.json({ message: 'Pedido reabierto', order: orderDto(order, { includeTimeline: true }) }); }
  catch (error) { return next(error); }
}
async function retryCompletedNotification(req, res, next) {
  try {
    if (!validId(req.params.orderId)) return res.status(400).json({ message: 'El identificador del pedido no es válido' });
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (req.user.role === 'worker' && String(order.assignedWorker || '') !== String(req.user.userId))
      return res.status(403).json({ message: 'Debes tener el pedido asignado para reintentar la notificación' });
    if (order.status !== 'Completed' || !order.completionNotification?.transitionEventId)
      return res.status(409).json({ message: 'El pedido no tiene una notificación de completado pendiente' });
    const notification = await notifyCompleted(req, order);
    return res.json({ order: { id: String(order._id), status: order.status }, notification });
  } catch (error) { return next(error); }
}

module.exports = {
  assignOrder, buildFilter, getOrderDetail, getWorkerOrders: listOrders, listOrders,
  notifyCompleted, parsePagination, paymentStatusFilter, reopenOrder, retryCompletedNotification, transitionOrder, updateOrderStatus,
  PROFILE_MATCH_LIMIT, SMS_LEASE_MS,
};
