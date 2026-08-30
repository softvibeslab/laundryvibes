export const ORDER_QUEUES = Object.freeze([
  { status: 'Pending', label: 'Por recibir' },
  { status: 'In Progress', label: 'En proceso' },
  { status: 'Completed', label: 'Listo' },
  { status: 'Delivered', label: 'Entregado' },
  { status: 'Cancelled', label: 'Cancelado' },
]);

export const PAYMENT_FILTERS = Object.freeze([
  { value: '', label: 'Todos los pagos' },
  { value: 'unpaid', label: 'Sin pagar' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'pending_review', label: 'Pendiente de revisión' },
  { value: 'paid', label: 'Pagado' },
]);

export const NEXT_STATUS = Object.freeze({
  Pending: 'In Progress',
  'In Progress': 'Completed',
  Completed: 'Delivered',
});

export const NEXT_STATUS_LABEL = Object.freeze({
  'In Progress': 'Recibir e iniciar',
  Completed: 'Marcar como listo',
  Delivered: 'Marcar como entregado',
});

export const TERMINAL_STATUSES = Object.freeze(['Delivered', 'Cancelled']);

export function orderId(order) {
  return order?.id || order?.orderId || order?.OrderId || '';
}

export function canOperate(order, role, actorId) {
  if (!order || role === 'admin') return Boolean(order);
  return role === 'worker' && String(order.assignedWorker?.id || '') === String(actorId || '');
}

export function canUsePos(order, role, actorId, posAvailable = true) {
  if (!posAvailable || !order?.pricing || order.payment?.status === 'paid') return false;
  return role === 'admin' || canOperate(order, role, actorId);
}

export function availableOrderActions(order, role, actorId) {
  if (!order) return { canAssign: false, canTransition: false, canCancel: false, canReopen: false };
  const terminal = TERMINAL_STATUSES.includes(order.status);
  const operates = canOperate(order, role, actorId);
  return {
    canAssign: !terminal && (role === 'admin' || (role === 'worker' && !order.assignedWorker)),
    canTransition: Boolean(NEXT_STATUS[order.status]) && operates,
    canCancel: ['Pending', 'In Progress'].includes(order.status) && operates,
    canReopen: role === 'admin' && ['Completed', 'Delivered', 'Cancelled'].includes(order.status),
  };
}

export function timelineLabel(event) {
  if (!event) return 'Actualización';
  if (event.type === 'created') return 'Pedido creado';
  if (event.type === 'assignment') return event.fromWorker ? 'Pedido reasignado' : 'Pedido asignado';
  if (event.type === 'reopened') return 'Pedido reabierto';
  if (event.type === 'notification') return 'Notificación';
  if (event.type === 'transition') return `Estado: ${event.toStatus || 'actualizado'}`;
  return 'Actualización';
}

export function buildOrderParams(filters, page, limit = 25) {
  const params = { page, limit, status: filters.status };
  ['paymentStatus', 'workerId', 'dateFrom', 'dateTo', 'bagNumber', 'client', 'phone', 'room'].forEach((key) => {
    const value = filters[key]?.trim?.() ?? filters[key];
    if (value) params[key] = value;
  });
  return params;
}
