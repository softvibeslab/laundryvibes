const mongoose = require('mongoose');
const Order = require('../models/userOrder');
const Worker = require('../models/Worker/workerModel');
const { recordAudit } = require('./auditService');
const { runInTransaction } = require('./transactionService');

const STATES = Object.freeze(['Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled']);
const TRANSITIONS = Object.freeze({
  Pending: Object.freeze(['In Progress', 'Cancelled']),
  'In Progress': Object.freeze(['Completed', 'Cancelled']),
  Completed: Object.freeze(['Delivered']),
  Delivered: Object.freeze([]),
  Cancelled: Object.freeze([]),
});
const REOPENABLE = Object.freeze(['Completed', 'Delivered', 'Cancelled']);

class WorkflowError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

const validId = (id) => mongoose.isValidObjectId(id);
const cleanText = (value, { required = false } = {}) => {
  if (value === undefined || value === null) return required ? null : undefined;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if ((required && !text) || text.length > 1000) return null;
  return text || undefined;
};
const actorFrom = (req) => ({ id: req.user.userId, role: req.user.role });
const originFrom = (req, fallback = 'api') => ['web', 'api', 'legacy', 'system'].includes(req.body?.origin) ? req.body.origin : fallback;
const txOptions = (session) => (session ? { session } : {});
const assignmentCas = (assignedWorker) => (assignedWorker
  ? { assignedWorker }
  : { $or: [{ assignedWorker: null }, { assignedWorker: { $exists: false } }] });

async function getByIdInSession(id, session) {
  const query = Order.findById(id);
  return session && query?.session ? query.session(session) : query;
}
async function existsInSession(id, session) {
  const query = Order.exists({ _id: id });
  return session && query?.session ? query.session(session) : query;
}
async function transact(req, work) {
  return runInTransaction(work, { transactionRunner: req.app.locals.config.transactionRunner });
}

async function transition(req, { legacyCompleted = false } = {}) {
  const { orderId } = req.params;
  if (!validId(orderId)) throw new WorkflowError(400, 'El identificador del pedido no es válido', 'INVALID_ID');
  const toStatus = legacyCompleted ? 'Completed' : req.body.status;
  if (!STATES.includes(toStatus)) throw new WorkflowError(400, 'El estado solicitado no es válido', 'INVALID_STATUS');
  const comment = cleanText(req.body.comment);
  if (req.body.comment !== undefined && comment === null) throw new WorkflowError(400, 'El comentario no es válido', 'INVALID_COMMENT');
  if (toStatus === 'Cancelled' && !comment) throw new WorkflowError(400, 'La cancelación requiere un motivo', 'REASON_REQUIRED');
  const actor = actorFrom(req); const now = new Date();
  return transact(req, async (session) => {
    const candidate = await getByIdInSession(orderId, session);
    if (!candidate) throw new WorkflowError(404, 'Pedido no encontrado', 'NOT_FOUND');
    if (!TRANSITIONS[candidate.status]?.includes(toStatus)) throw new WorkflowError(409, `No se permite ${candidate.status} → ${toStatus}`, 'ILLEGAL_TRANSITION');
    if (actor.role === 'worker' && String(candidate.assignedWorker || '') !== String(actor.id))
      throw new WorkflowError(403, 'Debes tener el pedido asignado para modificarlo', 'NOT_ASSIGNED');
    const eventId = new mongoose.Types.ObjectId();
    const set = { status: toStatus };
    if (toStatus === 'Completed') set.completionNotification = { transitionEventId: eventId, status: 'pending', attempts: 0 };
    const transitionFilter = { _id: orderId, status: candidate.status, ...assignmentCas(candidate.assignedWorker) };
    const order = await Order.findOneAndUpdate(
      transitionFilter,
      { $set: set, $push: { timeline: { _id: eventId, type: 'transition', fromStatus: candidate.status, toStatus, actor, comment, origin: originFrom(req, legacyCompleted ? 'legacy' : 'api'), timestamp: now } } },
      { new: true, runValidators: true, ...txOptions(session) },
    );
    if (!order) throw new WorkflowError(409, 'El pedido cambió mientras se procesaba la solicitud', 'RACE_CONFLICT');
    await recordAudit({
      action: 'order.transition', target: { type: 'order', id: String(orderId) }, actor,
      origin: { channel: 'http', ip: String(req.ip || '').slice(0, 100), userAgent: String(req.get?.('user-agent') || '').slice(0, 300) },
      metadata: { fromStatus: candidate.status, toStatus, comment: comment || '', eventId: String(eventId) }, session,
    });
    return order;
  });
}

async function assign(req) {
  const { orderId } = req.params;
  if (!validId(orderId)) throw new WorkflowError(400, 'El identificador del pedido no es válido', 'INVALID_ID');
  const workerId = req.user.role === 'worker' ? req.user.userId : req.body.workerId;
  if (!validId(workerId)) throw new WorkflowError(400, 'El identificador del trabajador no es válido', 'INVALID_WORKER_ID');
  if (req.user.role === 'worker' && req.body.workerId && String(req.body.workerId) !== String(req.user.userId))
    throw new WorkflowError(403, 'Un trabajador sólo puede asignarse a sí mismo', 'RBAC');
  const actor = actorFrom(req); const now = new Date();
  return transact(req, async (session) => {
    const workerQuery = Worker.findOne({ _id: workerId, role: 'worker', active: true });
    const worker = await (session && workerQuery?.session ? workerQuery.session(session) : workerQuery);
    if (!worker) throw new WorkflowError(409, 'El trabajador no existe o no está activo', 'INACTIVE_WORKER');
    const candidate = await getByIdInSession(orderId, session);
    if (!candidate) throw new WorkflowError(404, 'Pedido no encontrado', 'NOT_FOUND');
    if (['Delivered', 'Cancelled'].includes(candidate.status)) throw new WorkflowError(409, 'Un pedido cerrado no puede asignarse', 'CLOSED');
    if (actor.role === 'worker' && candidate.assignedWorker && String(candidate.assignedWorker) !== String(workerId))
      throw new WorkflowError(409, 'El pedido está asignado a otro trabajador', 'ASSIGNMENT_CONFLICT');
    const eventId = new mongoose.Types.ObjectId();
    const assignmentFilter = { _id: orderId, status: candidate.status, ...assignmentCas(candidate.assignedWorker) };
    const order = await Order.findOneAndUpdate(
      assignmentFilter,
      { $set: { assignedWorker: workerId, assignedAt: now, assignedBy: actor.id }, $push: { timeline: { _id: eventId, type: 'assignment', actor, fromWorker: candidate.assignedWorker || undefined, toWorker: workerId, comment: cleanText(req.body.comment), origin: originFrom(req), timestamp: now } } },
      { new: true, runValidators: true, ...txOptions(session) },
    );
    if (!order) throw new WorkflowError(409, 'La asignación cambió mientras se procesaba la solicitud', 'RACE_CONFLICT');
    await recordAudit({ action: 'order.assignment', target: { type: 'order', id: String(orderId) }, actor, origin: { channel: 'http' }, metadata: { fromWorker: candidate.assignedWorker ? String(candidate.assignedWorker) : '', workerId: String(workerId), eventId: String(eventId) }, session });
    return order;
  });
}

async function reopen(req) {
  const { orderId } = req.params;
  if (!validId(orderId)) throw new WorkflowError(400, 'El identificador del pedido no es válido', 'INVALID_ID');
  const reason = cleanText(req.body.reason, { required: true });
  if (!reason) throw new WorkflowError(400, 'La reapertura requiere un motivo válido', 'REASON_REQUIRED');
  const actor = actorFrom(req); const now = new Date();
  return transact(req, async (session) => {
    const candidate = await getByIdInSession(orderId, session);
    if (!candidate) throw new WorkflowError(404, 'Pedido no encontrado', 'NOT_FOUND');
    if (!REOPENABLE.includes(candidate.status)) throw new WorkflowError(409, 'El pedido no se encuentra en un estado reabrible', 'NOT_REOPENABLE');
    let retainedWorker = null;
    if (candidate.assignedWorker) {
      const workerQuery = Worker.findOne({ _id: candidate.assignedWorker, role: 'worker', active: true });
      retainedWorker = await (session && workerQuery?.session ? workerQuery.session(session) : workerQuery);
    }
    const eventId = new mongoose.Types.ObjectId();
    const assignmentChanged = Boolean(candidate.assignedWorker && !retainedWorker);
    const update = {
      $set: { status: 'In Progress' },
      $push: { timeline: { _id: eventId, type: 'reopened', fromStatus: candidate.status, toStatus: 'In Progress', actor, comment: reason, origin: originFrom(req), timestamp: now } },
    };
    if (assignmentChanged) update.$unset = { assignedWorker: 1, assignedAt: 1, assignedBy: 1 };
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: candidate.status, ...assignmentCas(candidate.assignedWorker) },
      update,
      { new: true, runValidators: true, ...txOptions(session) },
    );
    if (!order) throw new WorkflowError(409, 'El pedido cambió mientras se procesaba la solicitud', 'RACE_CONFLICT');
    await recordAudit({ action: 'order.reopened', target: { type: 'order', id: String(orderId) }, actor, origin: { channel: 'http' }, metadata: { fromStatus: candidate.status, reason, eventId: String(eventId), assignmentCleared: assignmentChanged }, session });
    return order;
  });
}

module.exports = { REOPENABLE, STATES, TRANSITIONS, WorkflowError, assign, assignmentCas, cleanText, reopen, transition, validId };
