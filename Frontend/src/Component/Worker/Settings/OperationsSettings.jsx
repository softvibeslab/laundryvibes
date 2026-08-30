import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserCog,
  UserPlus,
} from 'lucide-react';
import Navbar from '../Navbar/Navbar';
import { apiMessageEs } from '../../../utils/localization';

const roleContent = {
  admin: {
    label: 'Administrador',
    description: 'Supervisa la operación y puede crear accesos para trabajadores.',
  },
  worker: {
    label: 'Trabajador',
    description: 'Gestiona pedidos e inventario durante la operación diaria.',
  },
};

const OperationsSettings = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') === 'admin' ? 'admin' : 'worker';
  const content = roleContent[role];
  const [form, setForm] = useState({ email: '', password: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/login', { replace: true });
  };

  const createWorker = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (form.password.length < 8) {
      setStatus({ type: 'error', message: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/admin/add-worker', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setStatus({ type: 'success', message: response.data.message || 'Acceso de trabajador creado correctamente.' });
      setForm({ email: '', password: '' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: apiMessageEs(error.response?.data?.message, 'No se pudo crear el acceso del trabajador.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 px-4 pb-12 pt-28 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              {role === 'admin' ? 'Administración' : 'Cuenta operativa'}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">Configuración y acceso</h1>
            <p className="mt-2 text-gray-600">Consulta los permisos de tu perfil y administra tu sesión.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`rounded-xl p-3 ${role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {role === 'admin' ? <ShieldCheck className="h-7 w-7" /> : <UserCog className="h-7 w-7" />}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sesión actual</p>
                  <h2 className="text-xl font-bold text-gray-900">{content.label}</h2>
                  <p className="mt-1 text-sm text-gray-600">{content.description}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">Permisos habilitados</h3>
                <ul className="mt-3 space-y-3 text-sm text-gray-700">
                  <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> Consultar y completar pedidos.</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> Registrar consumo y reposición de inventario.</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> Consultar alertas y analítica operativa.</li>
                  {role === 'admin' && (
                    <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-purple-600" /> Crear cuentas de trabajador.</li>
                  )}
                </ul>
              </div>

              <button
                type="button"
                onClick={logout}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700 transition hover:bg-red-100"
              >
                <LogOut className="h-5 w-5" />
                Cerrar sesión
              </button>
            </section>

            {role === 'admin' ? (
              <section className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-purple-100 p-3 text-purple-700"><UserPlus className="h-6 w-6" /></div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Crear acceso de trabajador</h2>
                    <p className="text-sm text-gray-600">Esta función es exclusiva del administrador.</p>
                  </div>
                </div>

                <form className="mt-6 space-y-4" onSubmit={createWorker}>
                  <div>
                    <label htmlFor="worker-email" className="mb-1 block text-sm font-medium text-gray-700">Correo del trabajador</label>
                    <input
                      id="worker-email"
                      type="email"
                      autoComplete="off"
                      required
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      placeholder="trabajador@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="worker-password" className="mb-1 block text-sm font-medium text-gray-700">Contraseña temporal</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        id="worker-password"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={form.password}
                        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                        className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
                  </div>

                  {status.message && (
                    <div role="status" className={`rounded-lg border p-3 text-sm ${status.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                      {status.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                  >
                    <UserPlus className="h-5 w-5" />
                    {submitting ? 'Creando acceso...' : 'Crear trabajador'}
                  </button>
                </form>
              </section>
            ) : (
              <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
                <h2 className="text-xl font-bold text-gray-900">¿Qué puede hacer un administrador?</h2>
                <p className="mt-3 text-gray-700">
                  Además de compartir las vistas de pedidos e inventario, el administrador puede crear accesos de trabajador. Tu perfil de trabajador no puede crear ni administrar otras cuentas.
                </p>
                <p className="mt-4 text-sm text-gray-600">
                  Los cambios de contraseña para cuentas operativas todavía no están disponibles en esta versión.
                </p>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default OperationsSettings;
