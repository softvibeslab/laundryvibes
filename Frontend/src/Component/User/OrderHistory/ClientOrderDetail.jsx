import { useEffect, useId, useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import PaymentEvidenceButton from '../../PaymentEvidenceButton';
import { apiMessageEs, formatDateTimeEs, orderStatusLabel } from '../../../utils/localization';
import { formatMoney } from '../../../utils/payments';
import { orderId, timelineLabel } from '../../../utils/orderWorkflow';

export default function ClientOrderDetail({ order, onClose, refreshVersion = 0 }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const titleId = useId();
  const id = orderId(order);
  useEffect(() => {
    let active = true;
    axios.get(`/api/user/orders/${id}`).then(({ data }) => active && setDetail(data.order)).catch((requestError) => active && setError(apiMessageEs(requestError.response?.data?.message, 'No se pudo cargar el detalle.')));
    return () => { active = false; };
  }, [id, refreshVersion]);
  useEffect(() => {
    const key = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"><section role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"><header className="sticky top-0 flex justify-between border-b bg-white p-5"><div><h2 id={titleId} className="text-xl font-bold">Seguimiento del pedido</h2><p className="break-all text-sm text-gray-500">{id}</p></div><button type="button" autoFocus onClick={onClose} aria-label="Cerrar detalle" className="rounded p-2"><X /></button></header>{error && <p role="alert" className="m-5 rounded bg-red-50 p-3 text-red-800">{error}</p>}{!detail && !error ? <p role="status" className="p-8 text-center">Cargando seguimiento…</p> : detail && <div className="space-y-5 p-5"><div className="grid grid-cols-2 gap-4"><Info label="Bolsa" value={detail.bagNumber || 'No disponible'} /><Info label="Estado" value={orderStatusLabel(detail.status)} /><Info label="Prendas" value={detail.numberOfClothes ?? detail.numberOfItems ?? 'N/D'} /><Info label="Peso" value={`${detail.weight ?? 'N/D'} kg`} /></div><section className="rounded bg-gray-50 p-4"><h3 className="font-bold">Pago</h3><p>{detail.payment?.statusLabel || 'Sin pagar'} · {detail.payment?.methodLabel || 'Sin método'}</p><p className="font-semibold">{detail.pricing ? formatMoney(detail.pricing.total, detail.pricing.currency) : 'Precio no disponible'}</p>{detail.payment?.evidenceAvailable && <PaymentEvidenceButton orderId={id} className="mt-2" />}</section><section><h3 className="text-lg font-bold">Timeline</h3>{detail.timeline?.length ? <ol className="mt-3 border-l-2 border-blue-200 pl-5">{[...detail.timeline].reverse().map((event) => <li key={event.id} className="relative mb-5"><span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full bg-blue-700" /><p className="font-semibold">{timelineLabel(event)}</p>{event.fromStatus && <p className="text-sm">{orderStatusLabel(event.fromStatus)} → {orderStatusLabel(event.toStatus)}</p>}<p className="text-sm text-gray-600">{formatDateTimeEs(event.timestamp)}</p>{event.comment && <p className="mt-1 rounded bg-gray-50 p-2 text-sm">{event.comment}</p>}</li>)}</ol> : <p className="mt-2 text-gray-500">No hay eventos disponibles.</p>}</section></div>}</section></div>;
}

function Info({ label, value }) { return <div><p className="text-xs font-semibold uppercase text-gray-500">{label}</p><p className="font-medium">{value}</p></div>; }
