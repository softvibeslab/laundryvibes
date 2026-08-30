import { Link } from "react-router-dom";
import BrandLogo from '../Brand/BrandLogo';

const RoleSelector = () => {
  return (
    <>
      {/* Main Container */}
      <div className="bg-softBlue h-screen overflow-y-auto">
        {/* Heading */}
        <div className="flex flex-col items-center pt-20 px-4">
          <Link to="/" className="mb-8" aria-label="LaundryVibes, volver al inicio"><BrandLogo size={52} /></Link>
          <h1 className="font-bold text-3xl sm:text-5xl text-center">
            Bienvenido a LaundryVibes
          </h1>
          <h2
            className="mt-5 text-lg sm:text-xl text-center"
            style={{ color: '#6B7280' }}
          >
            Selecciona cómo deseas continuar
          </h2>
        </div>

        {/* Role Selector */}
        <div className="flex flex-wrap justify-center gap-6 mt-14 px-4 pb-10">
            {/* User Card */}
            <div className="bg-green-100 rounded-lg shadow-md p-6 text-center h-auto w-full sm:w-[329px]">
            <div className="text-green-500 text-3xl mb-4">👤</div>
            <h2 className="text-xl font-semibold mb-2">Continuar como cliente</h2>
            <p className="text-gray-600 mb-4">
              Realiza pedidos, sigue el estado de tu ropa y administra tu cuenta
            </p>
            
             <Link  className="text-green-500 font-semibold hover:underline" to="/login">
             
            
              Comenzar →
              </Link>
            
          </div>
          {/* Worker Card */}
          <div className="bg-blue-100 rounded-lg shadow-md p-6 text-center h-auto w-full sm:w-[329px]">
            <div className="text-blue-500 text-3xl mb-4">📦</div>
            <h2 className="text-xl font-semibold mb-2">Continuar como trabajador</h2>
            <p className="text-gray-600 mb-4">
              Accede a tu panel de trabajo, administra pedidos y consulta tus tareas
            </p>
          <Link 
              className="text-blue-500 font-semibold hover:underline"
            to='/login'>
              Comenzar →
              </Link>
          </div>

          {/* Admin Card */}
          <div className="bg-purple-100 rounded-lg shadow-md p-6 text-center h-auto w-full sm:w-[329px]">
            <div className="text-purple-500 text-3xl mb-4">🛡️</div>
            <h2 className="text-xl font-semibold mb-2">Continuar como administrador</h2>
            <p className="text-gray-600 mb-4">
              Supervisa pedidos e inventario y crea accesos protegidos para trabajadores
            </p>
            <Link
              to="/login"
              className="text-purple-500 font-semibold hover:underline"
            >
              Comenzar →
            </Link>
          </div>

        
        </div>
      </div>
    </>
  );
};

export default RoleSelector;
