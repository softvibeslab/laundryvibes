import { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Banknote, CreditCard, Landmark, Package, Scale, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { OrderContext } from './OrderContext';
import { apiMessageEs } from '../../../utils/localization';
import {
  EVIDENCE_ACCEPT,
  formatMoney,
  getPaymentConfig,
  validateEvidenceFile,
} from '../../../utils/payments';

const methodIcons = { cash: Banknote, transfer: Landmark, card: CreditCard };

export default function SubmitOrder() {
  const navigate = useNavigate();
  const {
    weight, setWeight, numberofitems, setNumberOfItems, setSubmittedOrder,
  } = useContext(OrderContext);
  const [user, setUser] = useState({});
  const [config, setConfig] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    Promise.all([axios.get('/api/user/profile'), getPaymentConfig()])
      .then(([profileResponse, paymentConfig]) => {
        if (!current) return;
        setUser(profileResponse.data);
        setConfig(paymentConfig);
        const firstEnabled = paymentConfig.methods.find((method) => method.enabled);
        setPaymentMethod(firstEnabled?.id || '');
      })
      .catch((requestError) => {
        if (current) setError(apiMessageEs(requestError.response?.data?.message, 'No se pudo cargar la información del pedido.'));
      })
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, []);

  const activeMethods = useMemo(
    () => config?.methods.filter((method) => method.enabled) || [],
    [config],
  );
  const selectedMethod = activeMethods.find((method) => method.id === paymentMethod);
  const estimate = (Number(weight) || 0) * (Number(config?.pricePerKg) || 0);

  const selectMethod = (method) => {
    setPaymentMethod(method.id);
    setError('');
    if (!method.requiresEvidence) setEvidence(null);
  };

  const onEvidenceChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setEvidence(null);
      return;
    }
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

  const submitOrder = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError('');

    const clothes = Number(numberofitems);
    const kilos = Number(weight);
    if (!Number.isInteger(clothes) || clothes < 1) {
      setError('El número de prendas debe ser un número entero mayor que cero.');
      return;
    }
    if (!Number.isFinite(kilos) || kilos <= 0) {
      setError('El peso debe ser mayor que cero.');
      return;
    }
    if (!selectedMethod) {
      setError('Selecciona un método de pago activo.');
      return;
    }
    if (selectedMethod.requiresEvidence && !evidence) {
      setError('Adjunta evidencia JPG, PNG, WebP o PDF para este método.');
      return;
    }

    const formData = new FormData();
    formData.append('numberOfClothes', String(clothes));
    formData.append('weight', String(kilos));
    formData.append('paymentMethod', selectedMethod.id);
    if (evidence) formData.append('evidence', evidence);

    setSubmitting(true);
    try {
      const { data } = await axios.post('/api/user/submit-order', formData);
      // La confirmación utiliza exclusivamente el pedido recalculado por el servidor.
      setSubmittedOrder(data.order);
      navigate('/user/submit-order/success');
    } catch (requestError) {
      setError(apiMessageEs(requestError.response?.data?.message, 'No se pudo enviar el pedido.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <main className="px-4 py-8 md:ml-64 md:px-8">
        <form onSubmit={submitOrder} className="mx-auto max-w-4xl space-y-6" noValidate>
          <header>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Nuevo pedido</p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Realizar pedido</h1>
            <p className="mt-1 text-gray-600">Revisa tus datos, la cotización y el método antes de confirmar.</p>
          </header>

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}

          {loading ? (
            <div role="status" className="rounded-xl bg-white p-8 text-center shadow-sm">Cargando configuración…</div>
          ) : config ? (
            <>
              <section className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Datos del pedido</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <ReadOnlyField label="Nombre" value={user.name} />
                  <ReadOnlyField label="Número de bolsa" value={user.bagNumber} />
                  <ReadOnlyField label="Habitación" value={user.roomNumber} />
                  <ReadOnlyField label="Edificio" value={user.buildingName} />
                  <label className="block text-sm font-medium text-gray-700">
                    Número de prendas
                    <span className="mt-1 flex items-center rounded-lg border border-gray-300 px-3 focus-within:ring-2 focus-within:ring-blue-300">
                      <Package className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      <input type="number" min="1" step="1" required value={numberofitems} onChange={(event) => setNumberOfItems(event.target.value)} className="w-full px-3 py-3 outline-none" />
                    </span>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Peso (kg)
                    <span className="mt-1 flex items-center rounded-lg border border-gray-300 px-3 focus-within:ring-2 focus-within:ring-blue-300">
                      <Scale className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      <input type="number" min="0.01" step="0.01" required value={weight} onChange={(event) => setWeight(event.target.value)} className="w-full px-3 py-3 outline-none" />
                    </span>
                  </label>
                </div>
              </section>

              <section className="rounded-xl bg-white p-5 shadow-sm" aria-labelledby="quote-title">
                <h2 id="quote-title" className="text-lg font-bold text-gray-900">Cotización estimada</h2>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3 rounded-lg bg-blue-50 p-4">
                  <div>
                    <p className="text-sm text-gray-600">Tarifa: {formatMoney(config.pricePerKg, config.currency, config.locale)} por kg</p>
                    <p className="text-xs text-gray-500">El servidor calcula y confirma el total final al guardar.</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">{formatMoney(estimate, config.currency, config.locale)}</p>
                </div>
              </section>

              <section className="rounded-xl bg-white p-5 shadow-sm">
                <fieldset>
                  <legend className="text-lg font-bold text-gray-900">Método de pago</legend>
                  <p className="mt-1 text-sm text-gray-600">Sólo se muestran los métodos habilitados por el negocio.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {activeMethods.map((method) => {
                      const Icon = methodIcons[method.id] || CreditCard;
                      return (
                        <label key={method.id} className={`cursor-pointer rounded-xl border-2 p-4 transition focus-within:ring-2 focus-within:ring-blue-400 ${paymentMethod === method.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                          <input type="radio" name="paymentMethod" value={method.id} checked={paymentMethod === method.id} onChange={() => selectMethod(method)} className="sr-only" />
                          <Icon className="h-6 w-6 text-blue-700" aria-hidden="true" />
                          <span className="mt-2 block font-semibold">{method.label}</span>
                          <span className="block text-xs text-gray-600">{method.requiresEvidence ? 'Requiere evidencia' : 'Pago al entregar'}</span>
                        </label>
                      );
                    })}
                  </div>
                  {!activeMethods.length && <p role="alert" className="mt-3 text-red-700">No hay métodos de pago disponibles.</p>}
                </fieldset>

                {selectedMethod?.requiresEvidence && (
                  <div className="mt-5 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4">
                    <label htmlFor="order-evidence" className="flex cursor-pointer items-center gap-3 font-semibold text-blue-800">
                      <Upload className="h-5 w-5" aria-hidden="true" />
                      Adjuntar evidencia
                    </label>
                    <input id="order-evidence" type="file" required accept={EVIDENCE_ACCEPT} onChange={onEvidenceChange} className="mt-3 block w-full text-sm" />
                    <p className="mt-2 text-xs text-gray-600">JPG, PNG, WebP o PDF. Máximo 2 MiB. No ingreses datos de tarjeta.</p>
                    {evidence && <p className="mt-2 break-all text-sm font-medium text-green-800">Archivo: {evidence.name}</p>}
                  </div>
                )}

                <div className="mt-6 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Proveedores futuros</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(config.comingSoon || []).map((provider) => (
                      <span key={provider} aria-disabled="true" className="rounded-full border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500">{provider} · Próximamente</span>
                    ))}
                  </div>
                </div>
              </section>

              <button type="submit" disabled={submitting || !activeMethods.length} className="w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300">
                {submitting ? 'Enviando pedido…' : 'Confirmar pedido'}
              </button>
            </>
          ) : null}
        </form>
      </main>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-1 min-h-12 rounded-lg bg-gray-50 px-3 py-3 text-gray-800">{value || 'No disponible'}</p>
    </div>
  );
}
