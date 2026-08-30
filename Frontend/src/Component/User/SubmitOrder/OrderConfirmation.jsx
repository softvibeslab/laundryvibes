import { useContext } from 'react';
import { CheckCircle, Clock, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { OrderContext } from './OrderContext';
import { formatMoney } from '../../../utils/payments';

export default function OrderConfirmation() {
  const { submittedOrder } = useContext(OrderContext);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex min-h-screen items-center justify-center px-4 py-10 md:ml-64">
        <section className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8" aria-labelledby="confirmation-title">
          <CheckCircle className="mx-auto mb-4 h-20 w-20 text-green-600" aria-hidden="true" />
          <h1 id="confirmation-title" className="text-3xl font-bold text-gray-900">¡Pedido enviado!</h1>
          <p className="mt-2 text-gray-600">El servidor confirmó tu pedido de lavandería.</p>

          {submittedOrder ? (
            <div className="mt-6 rounded-xl border border-gray-200 p-4 text-left">
              <div className="mb-3 flex items-center gap-2 font-bold text-gray-900">
                <ReceiptText className="h-5 w-5 text-blue-700" aria-hidden="true" />
                Pedido {submittedOrder.id ? `n.º ${submittedOrder.id}` : ''}
              </div>
              <Summary label="Prendas" value={`${submittedOrder.numberOfClothes} prendas`} />
              <Summary label="Peso" value={`${submittedOrder.weight} kg`} />
              <Summary label="Tarifa" value={formatMoney(submittedOrder.pricing?.pricePerKg, submittedOrder.pricing?.currency)} />
              <Summary label="Total confirmado" value={formatMoney(submittedOrder.pricing?.total, submittedOrder.pricing?.currency)} strong />
              <Summary label="Método" value={submittedOrder.payment?.methodLabel || 'No disponible'} />
              <Summary label="Estado del pago" value={submittedOrder.payment?.statusLabel || 'No disponible'} />
            </div>
          ) : (
            <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              Consulta el resumen autoritativo en tu historial de pedidos.
            </div>
          )}

          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" aria-hidden="true" />
            El estado del pedido y del pago se actualizan por separado.
          </div>
          <Link to="/user/order-history" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-6 py-2 font-semibold text-white hover:bg-blue-800">
            Ver historial de pedidos
          </Link>
        </section>
      </main>
    </div>
  );
}

function Summary({ label, value, strong = false }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className={strong ? 'font-bold text-blue-800' : 'font-semibold text-gray-900'}>{value}</span>
    </div>
  );
}
