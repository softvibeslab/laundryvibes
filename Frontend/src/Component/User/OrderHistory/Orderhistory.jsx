import { useEffect, useState } from 'react';
import axios from 'axios';
import { Package } from 'lucide-react';
import Sidebar from '../Sidebar';
import LoaderM from '../../../assets/loader/loader';
import PaymentEvidenceButton from '../../PaymentEvidenceButton';
import { apiMessageEs, formatDateEs, orderStatusLabel } from '../../../utils/localization';
import { formatMoney } from '../../../utils/payments';

export default function Orderhistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    axios.get('/api/user/order-history')
      .then(({ data }) => current && setOrders(data.order || []))
      .catch((requestError) => current && setError(apiMessageEs(requestError.response?.data?.message, 'No se pudo cargar tu historial.')))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="px-4 py-8 md:ml-64 md:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900">Historial de pedidos</h1>
          <p className="mt-1 text-gray-600">Consulta por separado el progreso del servicio y su pago.</p>
          {error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}

          {loading ? (
            <div className="mt-8 flex justify-center"><LoaderM /></div>
          ) : orders.length === 0 ? (
            <div className="mt-6 rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">No se encontraron pedidos.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {orders.map((order) => (
                <article key={order.orderId || order.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex gap-3">
                      <div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Package className="h-6 w-6" aria-hidden="true" /></div>
                      <div>
                        <h2 className="break-all font-bold text-gray-900">Pedido n.º {order.orderId || order.id}</h2>
                        <p className="text-sm text-gray-600">{order.numberOfClothes} prendas · {order.weight} kg</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDateEs(order.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                    <span className="self-start rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">Pedido: {orderStatusLabel(order.status)}</span>
                  </div>

                  <div className="mt-4 grid gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Precio confirmado</p>
                      {order.pricing ? (
                        <>
                          <p className="mt-1 text-xl font-bold text-gray-900">{formatMoney(order.pricing.total, order.pricing.currency)}</p>
                          <p className="text-sm text-gray-600">{formatMoney(order.pricing.pricePerKg, order.pricing.currency)} por kg</p>
                        </>
                      ) : <p className="mt-1 text-sm text-gray-500">No disponible para este pedido anterior.</p>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pago</p>
                      <p className="mt-1 font-bold text-gray-900">{order.payment?.statusLabel || 'Sin pagar'}</p>
                      <p className="text-sm text-gray-600">{order.payment?.methodLabel || 'Método no registrado'}</p>
                      {order.payment?.evidenceAvailable && <PaymentEvidenceButton orderId={order.orderId || order.id} className="mt-2" />}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
