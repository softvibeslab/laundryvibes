import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowUpDown, CheckCircle, CreditCard, Download, Search } from 'lucide-react';
import { io } from 'socket.io-client';
import Navbar from '../Navbar/Navbar';
import LoaderM from '../../../assets/loader/loader';
import NotifyAndComplete from './NotifyAndComplete';
import PosPaymentModal from './PosPaymentModal';
import PaymentEvidenceButton from '../../PaymentEvidenceButton';
import { apiMessageEs, formatOrderDateEs, formatOrderTimeEs, orderStatusLabel } from '../../../utils/localization';
import { formatMoney, getPaymentConfig } from '../../../utils/payments';

export default function OrderManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [completionOrder, setCompletionOrder] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [newestFirst, setNewestFirst] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/worker/getallorderdetails');
      setOrders(data.orders || []);
      setOrdersError('');
    } catch (requestError) {
      setOrdersError(apiMessageEs(requestError.response?.data?.message, 'No se pudieron cargar los pedidos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPaymentConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError('');
    try {
      const config = await getPaymentConfig();
      setMethods(config.methods || []);
    } catch (requestError) {
      setMethods([]);
      setConfigError(apiMessageEs(requestError.response?.data?.message, 'No se pudieron cargar los métodos de pago.'));
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchPaymentConfig();
  }, [fetchOrders, fetchPaymentConfig]);

  useEffect(() => {
    const socket = io({ auth: { token: localStorage.getItem('token') } });
    socket.on('orders:refresh', fetchOrders);
    return () => socket.disconnect();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = orders.filter((order) => !query || String(order.bagNumber || '').toLowerCase().includes(query) || String(order.id || order.OrderId || '').toLowerCase().includes(query));
    return [...matches].sort((a, b) => {
      const difference = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return newestFirst ? difference : -difference;
    });
  }, [newestFirst, orders, searchQuery]);

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-gray-100"><LoaderM /></div>;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 p-4 pt-24 md:p-8 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div><h1 className="text-2xl font-bold text-gray-900">Gestión de pedidos</h1><p className="text-gray-600">Servicio y pago son acciones separadas.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative block">
                <span className="sr-only">Buscar pedido</span>
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Bolsa o identificador…" className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 sm:w-72" />
              </label>
              <button type="button" onClick={() => setNewestFirst((value) => !value)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border bg-white px-3 text-gray-700"><ArrowUpDown className="h-4 w-4" />{newestFirst ? 'Más recientes' : 'Más antiguos'}</button>
            </div>
          </div>
          {ordersError && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{ordersError} <button type="button" onClick={fetchOrders} className="ml-2 font-bold underline">Reintentar</button></div>}
          {configLoading && <div role="status" className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900">Cargando métodos de pago…</div>}
          {configError && <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">{configError} No se puede abrir el POS. <button type="button" onClick={fetchPaymentConfig} className="ml-2 font-bold underline">Reintentar</button></div>}

          <OrderSection
            title="Pedidos pendientes"
            icon={<Download className="h-5 w-5 text-yellow-600" />}
            orders={filteredOrders.filter((order) => order.status === 'Pending')}
            empty="No se encontraron pedidos pendientes."
            onComplete={setCompletionOrder}
            onPayment={setPaymentOrder}
            posAvailable={!configLoading && !configError && methods.some((method) => method.enabled)}
          />
          <OrderSection
            title="Pedidos completados"
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
            orders={filteredOrders.filter((order) => order.status === 'Completed')}
            empty="No se encontraron pedidos completados."
            onPayment={setPaymentOrder}
            posAvailable={!configLoading && !configError && methods.some((method) => method.enabled)}
          />
        </div>
      </main>

      <NotifyAndComplete isOpen={Boolean(completionOrder)} onClose={() => setCompletionOrder(null)} order={completionOrder} fetchOrders={fetchOrders} />
      {paymentOrder && <PosPaymentModal order={paymentOrder} methods={methods} onClose={() => setPaymentOrder(null)} onSaved={fetchOrders} />}
    </>
  );
}

function OrderSection({ title, icon, orders, empty, onComplete, onPayment, posAvailable }) {
  return (
    <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b p-5">{icon}<h2 className="text-lg font-bold">{title}</h2><span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm">{orders.length}</span></header>
      {orders.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600"><tr><th className="px-5 py-3">Pedido</th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Servicio</th><th className="px-5 py-3">Precio</th><th className="px-5 py-3">Pago</th><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Acciones</th></tr></thead>
            <tbody>
              {orders.map((order) => {
                const orderId = order.id || order.OrderId;
                const isPaid = order.payment?.status === 'paid';
                const needsRegularization = !order.pricing;
                const canRegisterPayment = !isPaid && !needsRegularization && posAvailable;
                return (
                  <tr key={orderId} className="border-t align-top">
                    <td className="px-5 py-4"><p className="font-semibold text-blue-700">Bolsa {order.bagNumber || 'N/D'}</p><p className="max-w-40 truncate text-xs text-gray-500" title={String(orderId)}>{orderId}</p></td>
                    <td className="px-5 py-4">{order.userName === 'N/A' ? 'No disponible' : order.userName}</td>
                    <td className="px-5 py-4"><p>{order.numberOfClothes ?? order.numberOfItems} prendas · {order.weight ?? 'N/D'} kg</p><p className="text-xs text-gray-500">{orderStatusLabel(order.status)}</p></td>
                    <td className="px-5 py-4">{order.pricing ? <><p className="font-bold">{formatMoney(order.pricing.total, order.pricing.currency)}</p><p className="text-xs text-gray-500">{formatMoney(order.pricing.pricePerKg, order.pricing.currency)}/kg</p></> : <span className="text-gray-500">No disponible</span>}</td>
                    <td className="px-5 py-4"><p className={`font-semibold ${isPaid ? 'text-green-700' : 'text-amber-700'}`}>{order.payment?.statusLabel || 'Sin pagar'}</p><p className="text-xs text-gray-600">{order.payment?.methodLabel || 'Sin método'}</p>{order.payment?.evidenceAvailable && <PaymentEvidenceButton orderId={orderId} className="mt-2" />}</td>
                    <td className="px-5 py-4 text-gray-600">{formatOrderDateEs(order)}<br />{formatOrderTimeEs(order)}</td>
                    <td className="px-5 py-4"><div className="flex flex-col items-start gap-2">{onComplete && <button type="button" onClick={() => onComplete(order)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-green-600 px-3 py-2 font-semibold text-white hover:bg-green-700"><CheckCircle className="h-4 w-4" />Completar servicio</button>}{!isPaid && <><button type="button" disabled={!canRegisterPayment} onClick={() => canRegisterPayment && onPayment(order)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"><CreditCard className="h-4 w-4" />Registrar pago</button>{needsRegularization && <span className="max-w-48 text-xs font-medium text-amber-700">Requiere regularización de precio antes del pago.</span>}</>}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="p-5 text-gray-500">{empty}</p>}
    </section>
  );
}
