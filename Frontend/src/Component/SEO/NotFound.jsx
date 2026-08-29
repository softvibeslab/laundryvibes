import { Link } from 'react-router-dom';
import BrandLogo from '../Brand/BrandLogo';

const NotFound = () => (
  <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
    <div className="max-w-lg text-center">
      <Link to="/" className="mb-8 inline-flex" aria-label="LaundryVibes, volver al inicio">
        <BrandLogo size={52} />
      </Link>
      <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Error 404</p>
      <h1 className="mt-3 text-4xl font-bold text-gray-900">Esta página no existe</h1>
      <p className="mt-4 text-gray-600">La dirección puede ser incorrecta o la página pudo cambiar de ubicación.</p>
      <Link to="/" className="mt-7 inline-flex rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">
        Volver al inicio
      </Link>
    </div>
  </main>
);

export default NotFound;
