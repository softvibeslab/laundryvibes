import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { CreditCard, Filter, Search } from 'lucide-react';
import { io } from 'socket.io-client';
import Navbar from '../Navbar/Navbar';
import LoaderM from '../../../assets/loader/loader';
import PosPaymentModal from './PosPaymentModal';
import OrderDetailModal from './OrderDetailModal';
import { apiMessageEs, formatOrderDateEs, orderStatusLabel } from '../../../utils/localization';
import { formatMoney, getPaymentConfig } from '../../../utils/payments';
import { ORDER_QUEUES, PAYMENT_FILTERS, buildOrderParams, canUsePos, orderId } from '../../../utils/orderWorkflow';

const defaultFilters = { status: 'Pending', paymentStatus: '', workerId: '', dateFrom: '', dateTo: '', bagNumber: '', client: '', phone: '', room: '' };
const searchFields = [
  ['bagNumber', 'Bolsa'], ['client', 'Cliente'], ['phone', 'Teléfono'], ['room', 'Habitación'],
];

export default function OrderManagement() {
  const role = localStorage.getItem('role') === 'admin' ? 'admin' : 'worker';
  const actorId = localStorage.getItem('userId') || '';
  const base = role === 'admin' ? '/api/admin' : '/api/worker';
  const [draft, setDraft] = useState(defaultFilters);
  const [filters, setFilters] = useState(defaultFilters);
  const [searchField, setSearchField] = useState('bagNumber');
  const [searchValue, setSearchValue] = useState('');
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0, limit: 25 });
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [listVersion, setListVersion] = useState(0);

  const fetchOrders = useCallback(async (requestedPage = pagination.page) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${base}/orders`, { params: buildOrderParams(filters, requestedPage, pagination.limit) });
      setOrders(data.items || data.orders || []);
      setListVersion((version) => version + 1);
      setPagination((current) => ({ ...current, page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages }));
      setError('');
    } catch (requestError) {
      setError(apiMessageEs(requestError.response?.data?.message, 'No se pudieron cargar los pedidos.'));
    } finally {
      setLoading(false);
    }
  }, [base, filters, pagination.limit, pagination.page]);

  useEffect(() => { fetchOrders(1); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    getPaymentConfig().then((config) => setMethods(config.methods || [])).catch(() => setMethods([]));
  }, []);
  useEffect(() => {
    const socket = io({ auth: { token: localStorage.getItem('token') } });
    const refresh = () => { setNotice('Hay actualizaciones en los pedidos.'); fetchOrders(); };
    socket.on('orders:refresh', refresh);
    socket.on('connect_error', () => setNotice('Actualización en tiempo real no disponible; puedes recargar la lista manualmente.'));
    return () => socket.disconnect();
  }, [fetchOrders]);

  const setDraftValue = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const applyFilters = (event) => {
    event.preventDefault();
    const cleanSearch = Object.fromEntries(searchFields.map(([key]) => [key, '']));
    setFilters({ ...draft, ...cleanSearch, [searchField]: searchValue.trim() });
  };
  const selectQueue = (status) => {
    const next = { ...draft, status };
    setDraft(next);
    setFilters({ ...filters, status });
  };
  const clearFilters = () => {
    setDraft(defaultFilters); setFilters(defaultFilters); setSearchField('bagNumber'); setSearchValue('');
  };
  const posAvailable = methods.some((method) => method.enabled);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 p-4 pt-24 md:p-8 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <header><h1 className="text-2xl font-bold text-gray-900">Flujo de pedidos</h1><p className="text-gray-600">Colas operativas, asignación, servicio y pago.</p></header>

          <nav aria-label="Colas de pedidos" className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {ORDER_QUEUES.map((queue) => <button key={queue.status} type="button" aria-current={filters.status === queue.status ? 'page' : undefined} onClick={() => selectQueue(queue.status)} className={`min-h-11 whitespace-nowrap rounded-full border px-4 font-semibold ${filters.status === queue.status ? 'border-blue-700 bg-blue-700 text-white' : 'bg-white text-gray-700 hover:border-blue-500'}`}>{queue.label}</button>)}
          </nav>

          <form onSubmit={applyFilters} className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium">Buscar por<select value={searchField} onChange={(event) => setSearchField(event.target.value)} className="mt-1 w-full rounded border px-3 py-2.5">{searchFields.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm font-medium">Término de búsqueda<span className="relative mt-1 block"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} maxLength="100" placeholder="Buscar…" className="w-full rounded border py-2.5 pl-9 pr-3" /></span></label>
              <label className="text-sm font-medium">Pago<select value={draft.paymentStatus} onChange={(event) => setDraftValue('paymentStatus', event.target.value)} className="mt-1 w-full rounded border px-3 py-2.5">{PAYMENT_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="text-sm font-medium">Trabajador (ID)<input value={draft.workerId} onChange={(event) => setDraftValue('workerId', event.target.value)} placeholder="Opcional" className="mt-1 w-full rounded border px-3 py-2.5" /></label>
              <label className="text-sm font-medium">Desde<input type="date" value={draft.dateFrom} onChange={(event) => setDraftValue('dateFrom', event.target.value)} className="mt-1 w-full rounded border px-3 py-2.5" /></label>
              <label className="text-sm font-medium">Hasta<input type="date" value={draft.dateTo} onChange={(event) => setDraftValue('dateTo', event.target.value)} className="mt-1 w-full rounded border px-3 py-2.5" /></label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded bg-blue-700 px-4 font-semibold text-white"><Filter className="h-4 w-4" />Aplicar filtros</button><button type="button" onClick={clearFilters} className="min-h-11 rounded border px-4 font-semibold">Limpiar</button><button type="button" onClick={() => fetchOrders()} className="min-h-11 rounded border px-4 font-semibold">Actualizar</button></div>
          </form>

          <div aria-live="polite" className="mt-3">{notice && <p role="status" className="rounded bg-blue-50 p-3 text-blue-900">{notice}</p>}{error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}</div>

          <section className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm" aria-label={`Pedidos: ${ORDER_QUEUES.find((queue) => queue.status === filters.status)?.label}`}>
            <header className="flex justify-between border-b p-4"><h2 className="font-bold">{ORDER_QUEUES.find((queue) => queue.status === filters.status)?.label}</h2><span>{pagination.total} pedidos</span></header>
            {loading ? <div className="flex justify-center p-10" role="status"><LoaderM /><span className="sr-only">Cargando pedidos</span></div> : !orders.length ? <p className="p-8 text-center text-gray-500">No hay pedidos para estos filtros.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="px-4 py-3">Bolsa / pedido</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Servicio</th><th className="px-4 py-3">Asignación</th><th className="px-4 py-3">Pago</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody>{orders.map((order) => <OrderRow key={orderId(order)} order={order} role={role} actorId={actorId} onDetail={setSelected} onPayment={setPaymentOrder} posAvailable={posAvailable} />)}</tbody></table></div>}
            <footer className="flex flex-col items-center justify-between gap-3 border-t p-4 sm:flex-row"><p>Página {pagination.page} de {Math.max(pagination.totalPages, 1)}</p><div className="flex gap-2"><button type="button" disabled={pagination.page <= 1 || loading} onClick={() => fetchOrders(pagination.page - 1)} className="min-h-10 rounded border px-4 disabled:opacity-50">Anterior</button><button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => fetchOrders(pagination.page + 1)} className="min-h-10 rounded border px-4 disabled:opacity-50">Siguiente</button></div></footer>
          </section>
        </div>
      </main>
      {selected && <OrderDetailModal order={selected} role={role} actorId={actorId} refreshVersion={listVersion} onClose={() => setSelected(null)} onChanged={() => fetchOrders()} onPayment={posAvailable ? (order) => { setPaymentOrder(order); } : null} />}
      {paymentOrder && <PosPaymentModal order={paymentOrder} methods={methods} onClose={() => setPaymentOrder(null)} onSaved={() => { setPaymentOrder(null); fetchOrders(); }} />}
    </>
  );
}

function OrderRow({ order, role, actorId, onDetail, onPayment, posAvailable }) {
  const id = orderId(order);
  return <tr className="border-t align-top"><td className="px-4 py-4"><p className="font-bold text-blue-800">Bolsa {order.bagNumber || 'N/D'}</p><p className="max-w-48 truncate text-xs text-gray-500" title={id}>{id}</p></td><td className="px-4 py-4"><p>{order.clientName || order.userName || 'No disponible'}</p><p className="text-xs text-gray-500">Hab. {order.roomNumber || 'N/D'} · {order.phoneNumber || 'Sin teléfono'}</p></td><td className="px-4 py-4"><p>{order.numberOfClothes ?? order.numberOfItems} prendas · {order.weight ?? 'N/D'} kg</p><p className="text-xs text-gray-500">{orderStatusLabel(order.status)}</p></td><td className="px-4 py-4">{order.assignedWorker?.email || order.assignedWorker?.id || 'Sin asignar'}</td><td className="px-4 py-4"><p className="font-semibold">{order.payment?.statusLabel || 'Sin pagar'}</p><p className="text-xs text-gray-500">{order.pricing ? formatMoney(order.pricing.total, order.pricing.currency) : 'Precio no disponible'}</p></td><td className="px-4 py-4">{formatOrderDateEs(order)}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onDetail(order)} className="min-h-10 rounded bg-blue-700 px-3 font-semibold text-white">Ver detalle</button>{canUsePos(order, role, actorId, posAvailable) && <button type="button" onClick={() => onPayment(order)} aria-label={`Registrar pago de la bolsa ${order.bagNumber || id}`} className="min-h-10 rounded border border-blue-700 px-3 text-blue-800"><CreditCard className="h-4 w-4" /></button>}</div></td></tr>;
}
