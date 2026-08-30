import { useEffect, useId, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { CheckCircle, CreditCard, RefreshCw, UserRound, X } from 'lucide-react';
import PaymentEvidenceButton from '../../PaymentEvidenceButton';
import { apiMessageEs, formatDateTimeEs, orderStatusLabel } from '../../../utils/localization';
import { formatMoney } from '../../../utils/payments';
import {
  NEXT_STATUS, NEXT_STATUS_LABEL, availableOrderActions, canUsePos, orderId, timelineLabel,
} from '../../../utils/orderWorkflow';

const emptyFeedback = { type: '', message: '' };

export default function OrderDetailModal({ order: initialOrder, role, actorId, refreshVersion, onClose, onChanged, onPayment }) {
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(emptyFeedback);
  const [comment, setComment] = useState('');
  const [workerId, setWorkerId] = useState('');
  const titleId = useId();
  const closeRef = useRef(null);
  const id = orderId(initialOrder);
  const base = role === 'admin' ? '/api/admin' : '/api/worker';

  const loadDetail = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${base}/orders/${id}`);
      setOrder(data.order);
      setWorkerId(data.order.assignedWorker?.id || '');
      setFeedback(emptyFeedback);
    } catch (error) {
      setFeedback({ type: 'error', message: apiMessageEs(error.response?.data?.message, 'No se pudo cargar el detalle.') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDetail(); }, [id, refreshVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const actions = useMemo(() => availableOrderActions(order, role, actorId), [actorId, order, role]);

  const mutate = async (path, body, success) => {
    setBusy(true);
    setFeedback(emptyFeedback);
    try {
      const { data } = await axios.patch(`${base}/orders/${id}/${path}`, body);
      if (data.order) setOrder(data.order);
      setComment('');
      setFeedback({ type: 'success', message: success });
      await onChanged?.();
    } catch (error) {
      const suffix = error.response?.status === 409 ? ' Actualiza el detalle antes de volver a intentar.' : '';
      setFeedback({ type: 'error', message: `${apiMessageEs(error.response?.data?.message, 'No se pudo completar la acción.')}${suffix}` });
    } finally {
      setBusy(false);
    }
  };

  const transition = (status) => {
    if (status === 'Cancelled' && !comment.trim()) {
      setFeedback({ type: 'error', message: 'Escribe el motivo de cancelación.' });
      return;
    }
    mutate('transition', { status, comment: comment.trim() || undefined, origin: 'web' }, status === 'Cancelled' ? 'Pedido cancelado.' : 'Estado actualizado.');
  };
  const assign = () => {
    if (role === 'admin' && !workerId.trim()) {
      setFeedback({ type: 'error', message: 'Ingresa el identificador de un trabajador activo.' });
      return;
    }
    mutate('assignment', role === 'admin' ? { workerId: workerId.trim(), comment: comment.trim() || undefined } : {}, order?.assignedWorker ? 'Pedido reasignado.' : 'Pedido asignado.');
  };
  const reopen = () => {
    if (!comment.trim()) {
      setFeedback({ type: 'error', message: 'Escribe el motivo de reapertura.' });
      return;
    }
    mutate('reopen', { reason: comment.trim() }, 'Pedido reabierto en “En proceso”.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b bg-white p-5">
          <div><h2 id={titleId} className="text-xl font-bold">Detalle del pedido</h2><p className="break-all text-sm text-gray-500">{id}</p></div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Cerrar detalle" className="rounded p-2 text-gray-600 hover:bg-gray-100 focus:ring"><X /></button>
        </header>
        {loading ? <p role="status" className="p-8 text-center">Cargando detalle…</p> : order && (
          <div className="space-y-6 p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Bolsa" value={order.bagNumber || 'No disponible'} />
              <Info label="Estado" value={orderStatusLabel(order.status)} />
              <Info label="Cliente" value={order.clientName || order.userName || 'No disponible'} />
              <Info label="Habitación" value={[order.buildingName, order.roomNumber].filter(Boolean).join(' · ') || 'No disponible'} />
              <Info label="Teléfono" value={order.phoneNumber || 'No disponible'} />
              <Info label="Servicio" value={`${order.numberOfClothes ?? order.numberOfItems ?? 'N/D'} prendas · ${order.weight ?? 'N/D'} kg`} />
              <Info label="Asignación" value={order.assignedWorker?.email || order.assignedWorker?.id || 'Sin asignar'} />
              <Info label="Creado" value={formatDateTimeEs(order.createdAt)} />
            </div>

            <section aria-labelledby={`${titleId}-payment`} className="rounded-lg border p-4">
              <h3 id={`${titleId}-payment`} className="font-bold">Precio y pago</h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <Info label="Total" value={order.pricing ? formatMoney(order.pricing.total, order.pricing.currency) : 'No disponible'} />
                <Info label="Estado del pago" value={order.payment?.statusLabel || 'Sin pagar'} />
                <Info label="Método" value={order.payment?.methodLabel || 'Sin método'} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {order.payment?.evidenceAvailable && <PaymentEvidenceButton orderId={id} />}
                {onPayment && canUsePos(order, role, actorId) && <button type="button" onClick={() => onPayment(order)} className="inline-flex min-h-10 items-center gap-2 rounded bg-blue-700 px-3 py-2 font-semibold text-white"><CreditCard className="h-4 w-4" />Registrar pago</button>}
              </div>
            </section>

            {(actions.canAssign || actions.canTransition || actions.canCancel || actions.canReopen) && (
              <section aria-labelledby={`${titleId}-actions`} className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 id={`${titleId}-actions`} className="font-bold text-blue-950">Acciones permitidas</h3>
                {role === 'admin' && actions.canAssign && <label className="mt-3 block text-sm font-medium">ID del trabajador activo<input value={workerId} onChange={(event) => setWorkerId(event.target.value)} className="mt-1 w-full rounded border bg-white px-3 py-2" placeholder="ObjectId del trabajador" /></label>}
                {(actions.canCancel || actions.canReopen || (role === 'admin' && actions.canAssign)) && <label className="mt-3 block text-sm font-medium">Comentario o motivo{(actions.canCancel || actions.canReopen) && ' (obligatorio para cancelar o reabrir)'}<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows="2" maxLength="500" className="mt-1 w-full rounded border bg-white px-3 py-2" /></label>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {actions.canAssign && <button type="button" disabled={busy} onClick={assign} className="inline-flex min-h-11 items-center gap-2 rounded bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-60"><UserRound className="h-4 w-4" />{role === 'worker' ? 'Asignarme pedido' : order.assignedWorker ? 'Reasignar' : 'Asignar'}</button>}
                  {actions.canTransition && <button type="button" disabled={busy} onClick={() => transition(NEXT_STATUS[order.status])} className="inline-flex min-h-11 items-center gap-2 rounded bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-60"><CheckCircle className="h-4 w-4" />{NEXT_STATUS_LABEL[NEXT_STATUS[order.status]]}</button>}
                  {actions.canCancel && <button type="button" disabled={busy} onClick={() => transition('Cancelled')} className="min-h-11 rounded bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-60">Cancelar pedido</button>}
                  {actions.canReopen && <button type="button" disabled={busy} onClick={reopen} className="inline-flex min-h-11 items-center gap-2 rounded bg-amber-700 px-4 py-2 font-semibold text-white disabled:opacity-60"><RefreshCw className="h-4 w-4" />Reabrir en proceso</button>}
                </div>
              </section>
            )}
            {role === 'worker' && order.assignedWorker && order.assignedWorker.id !== actorId && <p className="rounded bg-amber-50 p-3 text-amber-900">Este pedido está asignado a otro trabajador. Puedes consultarlo, pero no modificarlo.</p>}
            <div aria-live="polite">{feedback.message && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`rounded p-3 ${feedback.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>{feedback.message}</p>}</div>

            <section aria-labelledby={`${titleId}-timeline`}>
              <h3 id={`${titleId}-timeline`} className="text-lg font-bold">Timeline</h3>
              {order.timeline?.length ? <ol className="mt-3 border-l-2 border-blue-200 pl-5">{[...order.timeline].reverse().map((event) => <li key={event.id} className="relative mb-5"><span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full bg-blue-700" /><p className="font-semibold">{timelineLabel(event)}</p><p className="text-sm text-gray-600">{formatDateTimeEs(event.timestamp)} · {event.actor?.role || 'sistema'} · {event.origin || 'sistema'}</p>{event.fromStatus && <p className="text-sm text-gray-700">{orderStatusLabel(event.fromStatus)} → {orderStatusLabel(event.toStatus)}</p>}{event.type === 'assignment' && <p className="break-all text-sm text-gray-700">{event.fromWorker || 'Sin asignar'} → {event.toWorker || 'Sin asignar'}</p>}{event.comment && <p className="mt-1 rounded bg-gray-50 p-2 text-sm">{event.comment}</p>}</li>)}</ol> : <p className="mt-2 text-gray-500">No hay eventos disponibles.</p>}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 break-words font-medium text-gray-900">{value}</p></div>;
}
