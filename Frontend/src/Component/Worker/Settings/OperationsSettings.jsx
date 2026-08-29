import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, KeyRound, LogOut, Save, ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import Navbar from '../Navbar/Navbar';
import { apiMessageEs } from '../../../utils/localization';
import { formatMoney, getPaymentConfig } from '../../../utils/payments';

const roleContent = {
  admin: { label: 'Administrador', description: 'Configura el negocio, supervisa la operación y crea accesos.' },
  worker: { label: 'Trabajador', description: 'Gestiona pedidos, pagos e inventario durante la operación diaria.' },
};

export default function OperationsSettings() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') === 'admin' ? 'admin' : 'worker';
  const [workerForm, setWorkerForm] = useState({ email: '', password: '' });
  const [workerStatus, setWorkerStatus] = useState({ type: '', message: '' });
  const [creatingWorker, setCreatingWorker] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const loadPaymentConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError('');
    try {
      setPaymentConfig(await getPaymentConfig());
    } catch (error) {
      setPaymentConfig(null);
      setConfigError(apiMessageEs(error.response?.data?.message, 'No se pudo cargar la configuración de pagos.'));
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => { loadPaymentConfig(); }, [loadPaymentConfig]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/login', { replace: true });
  };

  const createWorker = async (event) => {
    event.preventDefault();
    if (creatingWorker) return;
    setWorkerStatus({ type: '', message: '' });
    if (workerForm.password.length < 8) {
      setWorkerStatus({ type: 'error', message: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    setCreatingWorker(true);
    try {
      const { data } = await axios.post('/api/admin/add-worker', {
        email: workerForm.email.trim().toLowerCase(), password: workerForm.password,
      });
      setWorkerStatus({ type: 'success', message: data.message || 'Acceso creado correctamente.' });
      setWorkerForm({ email: '', password: '' });
    } catch (error) {
      setWorkerStatus({ type: 'error', message: apiMessageEs(error.response?.data?.message, 'No se pudo crear el acceso.') });
    } finally {
      setCreatingWorker(false);
    }
  };

  const toggleMethod = (methodId) => {
    setConfigSuccess('');
    setConfigError('');
    setPaymentConfig((current) => ({
      ...current,
      methods: current.methods.map((method) => method.id === methodId ? { ...method, enabled: !method.enabled } : method),
    }));
  };

  const savePaymentConfig = async (event) => {
    event.preventDefault();
    if (savingConfig || !paymentConfig) return;
    setConfigError('');
    setConfigSuccess('');
    const price = Number(paymentConfig.pricePerKg);
    if (!Number.isFinite(price) || price <= 0 || price > 10000 || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(paymentConfig.pricePerKg))) {
      setConfigError('La tarifa debe ser mayor que cero, no superar $10,000 y tener máximo dos decimales.');
      return;
    }
    if (!paymentConfig.methods.some((method) => method.enabled)) {
      setConfigError('Debe permanecer activo al menos un método manual.');
      return;
    }
    setSavingConfig(true);
    try {
      const { data } = await axios.put('/api/admin/payment-config', {
        currency: 'MXN',
        pricePerKg: price,
        methods: paymentConfig.methods.map(({ id, enabled }) => ({ id, enabled })),
      });
      const effectiveConfig = data.config || data;
      setPaymentConfig((current) => ({ ...current, ...effectiveConfig }));
      setConfigSuccess(data.message || 'Configuración de pagos guardada correctamente.');
    } catch (error) {
      setConfigError(apiMessageEs(error.response?.data?.message, 'No se pudo guardar la configuración de pagos.'));
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 px-4 pb-12 pt-28 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">{role === 'admin' ? 'Administración' : 'Cuenta operativa'}</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Configuración y acceso</h1>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`rounded-xl p-3 ${role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {role === 'admin' ? <ShieldCheck className="h-7 w-7" /> : <UserCog className="h-7 w-7" />}
                </div>
                <div><p className="text-sm text-gray-500">Sesión actual</p><h2 className="text-xl font-bold">{roleContent[role].label}</h2><p className="mt-1 text-sm text-gray-600">{roleContent[role].description}</p></div>
              </div>
              <ul className="mt-6 space-y-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> Consultar y completar pedidos.</li>
                <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> Registrar pagos POS e inventario.</li>
                {role === 'admin' && <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-purple-600" /> Configurar tarifa y métodos de pago.</li>}
              </ul>
              <button type="button" onClick={logout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700 hover:bg-red-100"><LogOut className="h-5 w-5" /> Cerrar sesión</button>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Pagos del negocio</h2>
              {configLoading ? (
                <p className="mt-4 text-gray-600">Cargando configuración…</p>
              ) : !paymentConfig ? (
                <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{configError || 'No se pudo cargar la configuración de pagos.'}<button type="button" onClick={loadPaymentConfig} className="ml-2 font-bold underline">Reintentar</button></div>
              ) : role === 'admin' ? (
                <form onSubmit={savePaymentConfig} className="mt-5 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-gray-700">Moneda
                      <select value="MXN" disabled className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-gray-700"><option>MXN</option></select>
                      <span className="mt-1 block text-xs text-gray-500">Esta versión opera únicamente en pesos mexicanos.</span>
                    </label>
                    <label htmlFor="price-per-kg" className="text-sm font-medium text-gray-700">Tarifa por kilogramo
                      <input id="price-per-kg" type="number" min="0.01" max="10000" step="0.01" required value={paymentConfig.pricePerKg} onChange={(event) => setPaymentConfig((current) => ({ ...current, pricePerKg: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-300" />
                      <span className="mt-1 block text-xs text-gray-500">Vista previa: {formatMoney(paymentConfig.pricePerKg, 'MXN')}</span>
                    </label>
                  </div>
                  <fieldset>
                    <legend className="font-semibold text-gray-900">Métodos manuales habilitados</legend>
                    <div className="mt-3 space-y-2">
                      {paymentConfig.methods.map((method) => (
                        <label key={method.id} className="flex min-h-12 items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                          <span><span className="font-medium text-gray-900">{method.label}</span><span className="ml-2 text-xs text-gray-500">{method.requiresEvidence ? 'Requiere evidencia' : 'Sin evidencia'}</span></span>
                          <input type="checkbox" checked={method.enabled} onChange={() => toggleMethod(method.id)} className="h-5 w-5 rounded text-blue-700" />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Status error={configError} success={configSuccess} />
                  <button type="submit" disabled={savingConfig} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-blue-300"><Save className="h-5 w-5" /> {savingConfig ? 'Guardando…' : 'Guardar configuración'}</button>
                </form>
              ) : (
                <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">La configuración es de sólo lectura para trabajadores. Tarifa actual: <strong>{formatMoney(paymentConfig.pricePerKg, paymentConfig.currency)}</strong> por kg.</div>
              )}
              <div className="mt-5 border-t pt-4">
                <p className="text-sm font-semibold text-gray-700">Integraciones</p>
                <div className="mt-2 flex flex-wrap gap-2">{(paymentConfig?.comingSoon || ['PayPal', 'Mercado Pago', 'Stripe']).map((name) => <button key={name} type="button" disabled className="cursor-not-allowed rounded-lg border bg-gray-100 px-3 py-2 text-sm text-gray-500">{name} · Próximamente</button>)}</div>
              </div>

            </section>

            {role === 'admin' && (
              <section className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm lg:col-start-2">
                <div className="flex items-center gap-3"><UserPlus className="h-7 w-7 text-purple-700" /><div><h2 className="text-xl font-bold">Crear acceso de trabajador</h2><p className="text-sm text-gray-600">Función exclusiva del administrador.</p></div></div>
                <form className="mt-5 space-y-4" onSubmit={createWorker}>
                  <label htmlFor="worker-email" className="block text-sm font-medium">Correo
                    <input id="worker-email" type="email" required value={workerForm.email} onChange={(event) => setWorkerForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border px-4 py-2.5" />
                  </label>
                  <label htmlFor="worker-password" className="block text-sm font-medium">Contraseña temporal
                    <span className="relative mt-1 block"><KeyRound className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><input id="worker-password" type="password" required minLength="8" value={workerForm.password} onChange={(event) => setWorkerForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-lg border py-2.5 pl-10 pr-4" /></span>
                  </label>
                  {workerStatus.message && <div role={workerStatus.type === 'error' ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm ${workerStatus.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>{workerStatus.message}</div>}
                  <button type="submit" disabled={creatingWorker} className="w-full rounded-lg bg-purple-700 px-4 py-3 font-semibold text-white disabled:bg-purple-300">{creatingWorker ? 'Creando acceso…' : 'Crear trabajador'}</button>
                </form>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function Status({ error, success }) {
  if (!error && !success) return null;
  return <div role={error ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>{error || success}</div>;
}
