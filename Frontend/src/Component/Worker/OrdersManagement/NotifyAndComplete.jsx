// Adaptador de compatibilidad: los consumidores legacy pueden conservar estas props,
// pero la mutación usa el endpoint y la máquina de estados canónicos de Fase 2.
import { useId, useState } from 'react';
import axios from 'axios';
import { CheckCircle, X } from 'lucide-react';
import { apiMessageEs } from '../../../utils/localization';
import { orderId } from '../../../utils/orderWorkflow';

export default function NotifyAndComplete({ isOpen, onClose, order, fetchOrders, onCompleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const titleId = useId();
  if (!isOpen) return null;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await axios.patch(`/api/worker/orders/${orderId(order)}/transition`, { status: 'Completed', origin: 'legacy', comment: 'Completado desde interfaz compatible' });
      await fetchOrders?.();
      onCompleted?.(data.order, data.notification);
      onClose();
    } catch (requestError) {
      setError(apiMessageEs(requestError.response?.data?.message, 'No se pudo completar el pedido. Comprueba que esté en proceso y asignado a ti.'));
    } finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" className="absolute right-3 top-3 rounded p-2"><X /></button><CheckCircle className="h-8 w-8 text-green-700" /><h2 id={titleId} className="mt-2 text-xl font-bold">Marcar como listo</h2><p className="mt-2 text-gray-600">Bolsa {order?.bagNumber || 'N/D'}. Esta acción sólo es válida desde “En proceso”. El servidor gestionará la notificación sin alterar el estado si el envío falla.</p>{error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}<form onSubmit={submit} className="mt-5 flex gap-2"><button type="button" onClick={onClose} disabled={busy} className="min-h-11 flex-1 rounded border">Volver</button><button type="submit" disabled={busy} className="min-h-11 flex-1 rounded bg-green-700 font-semibold text-white disabled:opacity-60">{busy ? 'Actualizando…' : 'Confirmar'}</button></form></section></div>;
}
