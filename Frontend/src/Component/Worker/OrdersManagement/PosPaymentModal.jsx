import { useEffect, useState } from 'react';
import axios from 'axios';
import { CreditCard, X } from 'lucide-react';
import { apiMessageEs } from '../../../utils/localization';
import { EVIDENCE_ACCEPT, formatMoney, validateEvidenceFile } from '../../../utils/payments';

export default function PosPaymentModal({ order, methods, onClose, onSaved }) {
  const activeMethods = methods.filter((method) => method.enabled);
  const [paymentMethod, setPaymentMethod] = useState(activeMethods[0]?.id || '');
  const [evidence, setEvidence] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const selectedMethod = activeMethods.find((method) => method.id === paymentMethod);

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && !submitting && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, submitting]);

  const selectMethod = (method) => {
    setPaymentMethod(method.id);
    setError('');
    if (!method.requiresEvidence) setEvidence(null);
  };

  const selectFile = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return setEvidence(null);
    const validationError = validateEvidenceFile(file);
    if (validationError) {
      event.target.value = '';
      setEvidence(null);
      setError(validationError);
      return;
    }
    setEvidence(file);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!order.pricing) return setError('Este pedido requiere regularización de precio antes de registrar el pago.');
    if (!selectedMethod) return setError('Selecciona un método de pago activo.');
    if (selectedMethod.requiresEvidence && !evidence) return setError('Este método requiere evidencia.');
    const data = new FormData();
    data.append('paymentMethod', paymentMethod);
    if (evidence) data.append('evidence', evidence);
    setSubmitting(true);
    setError('');
    try {
      await axios.patch(`/api/worker/orders/${order.id || order.OrderId}/payment`, data);
      await onSaved();
      onClose();
    } catch (requestError) {
      setError(apiMessageEs(requestError.response?.data?.message, 'No se pudo registrar el pago.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="pos-title">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">POS manual</p><h2 id="pos-title" className="text-xl font-bold text-gray-900">Registrar pago recibido</h2></div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Cerrar registro de pago" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-gray-600">Pedido · Bolsa {order.bagNumber}</p>
          <p className="text-2xl font-bold text-blue-900">{order.pricing ? formatMoney(order.pricing.total, order.pricing.currency) : 'Total no disponible'}</p>
          <p className="text-sm text-blue-800">Estado actual: {order.payment?.statusLabel || 'Sin pagar'}</p>
        </div>
        <form onSubmit={submit} className="mt-5">
          <fieldset>
            <legend className="font-semibold text-gray-900">Método activo</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {activeMethods.map((method) => (
                <label key={method.id} className={`cursor-pointer rounded-lg border-2 p-3 focus-within:ring-2 focus-within:ring-blue-400 ${paymentMethod === method.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                  <input type="radio" className="sr-only" checked={paymentMethod === method.id} onChange={() => selectMethod(method)} />
                  <span className="font-semibold">{method.label}</span>
                  <span className="block text-xs text-gray-500">{method.requiresEvidence ? 'Con evidencia' : 'Sin evidencia'}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {selectedMethod?.requiresEvidence && (
            <label htmlFor="pos-evidence" className="mt-4 block rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
              Evidencia JPG, PNG, WebP o PDF (máx. 2 MiB)
              <input id="pos-evidence" type="file" required accept={EVIDENCE_ACCEPT} onChange={selectFile} className="mt-2 block w-full font-normal" />
              {evidence && <span className="mt-2 block break-all text-green-800">{evidence.name}</span>}
            </label>
          )}
          <p className="mt-4 text-xs text-gray-500">LaundryVibes sólo registra el pago recibido; no procesa tarjetas ni almacena PAN o CVV.</p>
          {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          {!activeMethods.length && <div role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No hay métodos de pago activos. Cierra esta ventana y reintenta cargar la configuración.</div>}
          <button type="submit" disabled={submitting || !activeMethods.length || !order.pricing} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-blue-300"><CreditCard className="h-5 w-5" /> {submitting ? 'Registrando…' : 'Registrar pago como pagado'}</button>
        </form>
      </div>
    </div>
  );
}
