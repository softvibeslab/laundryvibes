import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Package } from 'lucide-react';
import { io } from 'socket.io-client';
import Sidebar from '../Sidebar';
import LoaderM from '../../../assets/loader/loader';
import PaymentEvidenceButton from '../../PaymentEvidenceButton';
import ClientOrderDetail from './ClientOrderDetail';
import { apiMessageEs, formatDateEs, orderStatusLabel } from '../../../utils/localization';
import { formatMoney } from '../../../utils/payments';
import { ORDER_QUEUES, orderId } from '../../../utils/orderWorkflow';

export default function Orderhistory() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const load = useCallback(async (requestedPage = page) => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/user/orders', { params: { page: requestedPage, limit: 10, ...(status ? { status } : {}) } });
      setOrders(data.items || data.orders || []); setPage(data.page); setMeta({ total: data.total, totalPages: data.totalPages }); setError('');
    } catch (requestError) { setError(apiMessageEs(requestError.response?.data?.message, 'No se pudo cargar tu historial.')); }
    finally { setLoading(false); }
  }, [page, status]);
  useEffect(() => { load(1); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const socket = io({ auth: { token: localStorage.getItem('token') } });
    const refresh = () => { setNotice('Tu pedido tiene una actualización.'); setRefreshVersion((value) => value + 1); load(); };
    socket.on('orders:refresh', refresh);
    socket.on('connect_error', () => setNotice('El tiempo real no está disponible; puedes actualizar la lista manualmente.'));
    return () => socket.disconnect();
  }, [load]);

  return <div className="min-h-screen bg-gray-50"><Sidebar /><main className="px-4 py-8 md:ml-64 md:px-8"><div className="mx-auto max-w-4xl"><h1 className="text-2xl font-bold">Historial y seguimiento</h1><p className="mt-1 text-gray-600">Consulta el estado real, timeline y pago de tus pedidos.</p><label className="mt-5 block max-w-xs text-sm font-medium">Filtrar por estado<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded border px-3 py-2.5"><option value="">Todos</option>{ORDER_QUEUES.map((queue) => <option key={queue.status} value={queue.status}>{queue.label}</option>)}</select></label><div aria-live="polite" className="mt-4">{notice && <p role="status" className="rounded bg-blue-50 p-3 text-blue-900">{notice}</p>}{error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error} <button type="button" onClick={() => load()} className="font-bold underline">Reintentar</button></p>}</div>{loading ? <div className="mt-8 flex justify-center"><LoaderM /></div> : !orders.length ? <div className="mt-6 rounded-xl bg-white p-8 text-center text-gray-500">No se encontraron pedidos.</div> : <div className="mt-6 space-y-4">{orders.map((order) => <article key={orderId(order)} className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="flex gap-3"><div className="rounded bg-blue-50 p-2 text-blue-700"><Package /></div><div><h2 className="font-bold">Bolsa {order.bagNumber || 'N/D'}</h2><p className="max-w-sm break-all text-xs text-gray-500">ID: {orderId(order)}</p><p className="text-sm">{order.numberOfClothes ?? order.numberOfItems} prendas · {order.weight} kg</p><p className="text-xs text-gray-500">{formatDateEs(order.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p></div></div><span className="self-start rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-900">{orderStatusLabel(order.status)}</span></div><div className="mt-4 grid gap-3 rounded bg-gray-50 p-4 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase text-gray-500">Precio</p><p className="font-bold">{order.pricing ? formatMoney(order.pricing.total, order.pricing.currency) : 'No disponible'}</p></div><div><p className="text-xs font-bold uppercase text-gray-500">Pago</p><p>{order.payment?.statusLabel || 'Sin pagar'} · {order.payment?.methodLabel || 'Sin método'}</p>{order.payment?.evidenceAvailable && <PaymentEvidenceButton orderId={orderId(order)} className="mt-2" />}</div></div><button type="button" onClick={() => setSelected(order)} className="mt-4 min-h-11 rounded bg-blue-700 px-4 font-semibold text-white">Ver detalle y timeline</button></article>)}</div>}<footer className="mt-5 flex items-center justify-between"><p>{meta.total} pedidos · Página {page} de {Math.max(meta.totalPages, 1)}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => load(page - 1)} className="min-h-10 rounded border px-3 disabled:opacity-50">Anterior</button><button type="button" disabled={page >= meta.totalPages || loading} onClick={() => load(page + 1)} className="min-h-10 rounded border px-3 disabled:opacity-50">Siguiente</button></div></footer></div></main>{selected && <ClientOrderDetail order={selected} refreshVersion={refreshVersion} onClose={() => setSelected(null)} />}</div>;
}
