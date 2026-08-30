import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, LogOut, Package, Settings, ShieldCheck, Warehouse } from 'lucide-react';
import BrandLogo from '../../Brand/BrandLogo';

const navigationClass = ({ isActive }) => (
  `flex items-center whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition sm:text-base ${
    isActive
      ? 'border-blue-600 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-800'
  }`
);

const Navbar = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') === 'admin' ? 'admin' : 'worker';
  const dashboardPath = role === 'admin' ? '/admin/dashboard' : '/workerdashboard';
  const settingsPath = role === 'admin' ? '/admin/settings' : '/worker/settings';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/login', { replace: true });
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link to={dashboardPath} className="hidden shrink-0 sm:inline-flex" aria-label="LaundryVibes, ir al panel">
          <BrandLogo size={36} />
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-center gap-3 overflow-x-auto sm:gap-6 lg:gap-8" aria-label="Navegación operativa">
          <NavLink to={dashboardPath} className={navigationClass} aria-label="Panel">
            <LayoutGrid className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Panel</span>
          </NavLink>
          <NavLink to="/worker/orders" className={navigationClass} aria-label="Pedidos">
            <Package className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Pedidos</span>
          </NavLink>
          <NavLink to="/stock" className={navigationClass} aria-label="Inventario">
            <Warehouse className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Inventario</span>
          </NavLink>
          <NavLink to={settingsPath} className={navigationClass} aria-label={role === 'admin' ? 'Administración' : 'Mi cuenta'}>
            {role === 'admin' ? <ShieldCheck className="h-5 w-5 md:mr-2" /> : <Settings className="h-5 w-5 md:mr-2" />}
            <span className="hidden md:inline">{role === 'admin' ? 'Administración' : 'Mi cuenta'}</span>
          </NavLink>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold lg:inline-flex ${role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
            {role === 'admin' ? 'Administrador' : 'Trabajador'}
          </span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center rounded-lg border border-red-200 px-2.5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 sm:px-3"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
            <span className="ml-2 hidden xl:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
