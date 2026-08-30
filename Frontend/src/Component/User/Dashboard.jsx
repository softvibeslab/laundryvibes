import { useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, History, Loader2, Package, Shirt, TrendingUp, User } from 'lucide-react';
import { io } from 'socket.io-client';
import { NavLink } from 'react-router-dom';
import Card from './Card';
import Sidebar from './Sidebar';
import { OrderContext } from './SubmitOrder/OrderContext';
import LoaderM from '../../assets/loader/loader';
import { apiMessageEs, formatDateEs, orderStatusLabel } from '../../utils/localization';
import { orderId } from '../../utils/orderWorkflow';

const cards = [
  { title: 'Realizar pedido', icon: Shirt, route: '/user/submit-order', color: 'bg-blue-500', description: 'Envía nuevas prendas para su procesamiento' },
  { title: 'Historial de pedidos', icon: History, route: '/user/order-history', color: 'bg-purple-500', description: 'Consulta el detalle y timeline de tus pedidos' },
  { title: 'Horas de mayor demanda', icon: BarChart3, route: '/user/daily-rush', color: 'bg-green-500', description: 'Planifica según las horas de mayor demanda' },
  { title: 'Perfil', icon: User, route: '/user/profile', color: 'bg-orange-500', description: 'Administra la configuración de tu cuenta' },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState(null);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const { setBagNumber, setRoomNumber } = useContext(OrderContext);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profile, all, pendingResult] = await Promise.all([
        axios.get('/api/user/profile'),
        axios.get('/api/user/orders', { params: { page: 1, limit: 1 } }),
        axios.get('/api/user/orders', { params: { page: 1, limit: 1, status: 'Pending,In Progress,Completed' } }),
      ]);
      setBagNumber(profile.data.bagNumber || ''); setRoomNumber(profile.data.roomNumber || '');
      setRecent((all.data.items || all.data.orders || [])[0] || null);
      setTotal(all.data.total || 0); setPending(pendingResult.data.total || 0); setError('');
    } catch (requestError) { setError(apiMessageEs(requestError.response?.data?.message, 'No se pudo cargar el panel.')); }
    finally { setLoading(false); }
  }, [setBagNumber, setRoomNumber]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const socket = io({ auth: { token: localStorage.getItem('token') } }); socket.on('orders:refresh', load); return () => socket.disconnect();
  }, [load]);

  return <><Sidebar />{loading ? <div className="fixed inset-0 flex items-center justify-center bg-gray-100"><LoaderM /></div> : <main className="min-h-screen bg-gray-100 p-6 md:ml-64"><header className="mb-4 flex flex-wrap items-center justify-between"><h1 className="text-2xl font-bold">Panel</h1><p className="text-gray-600">{new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}</p></header>{error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-800">{error} <button type="button" onClick={load} className="font-bold underline">Reintentar</button></p>}<div className="grid gap-4 sm:grid-cols-3"><Card title="Pedidos activos" value={pending} icon={<Icon color="bg-blue-500"><Package /></Icon>} bgColor="bg-blue-100" textColor="text-blue-800" /><Card title="Total de pedidos" value={total} icon={<Icon color="bg-purple-500"><TrendingUp /></Icon>} bgColor="bg-purple-100" textColor="text-purple-800" /><Card title="Estado más reciente" value={recent ? orderStatusLabel(recent.status) : 'Sin pedidos'} icon={<Icon color="bg-green-500"><Loader2 /></Icon>} bgColor="bg-green-100" textColor="text-green-800" /></div>{recent && <section className="mt-6 rounded-lg bg-white p-4 shadow"><h2 className="text-xl font-semibold">Pedido reciente</h2><div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row"><div><h3 className="font-bold">Bolsa {recent.bagNumber || 'N/D'}</h3><p className="break-all text-xs text-gray-500">ID: {orderId(recent)}</p><p>{formatDateEs(recent.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p></div><span className="self-start font-bold text-blue-800">{orderStatusLabel(recent.status)}</span></div><NavLink to="/user/order-history" className="mt-3 inline-block font-semibold text-blue-700 underline">Ver detalle y timeline</NavLink></section>}<div className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-4">{cards.map((card) => <NavLink key={card.title} to={card.route} className="group rounded-xl bg-white p-6 shadow-md transition hover:scale-105"><div className="flex items-center gap-4"><div className={`flex h-12 w-12 items-center justify-center rounded-full ${card.color}`}><card.icon className="h-6 w-6 text-white" /></div><div><h3 className="font-medium">{card.title}</h3><p className="text-sm text-gray-600">{card.description}</p></div></div></NavLink>)}</div></main>}</>;
}
function Icon({ color, children }) { return <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${color}`}>{children}</div>; }
