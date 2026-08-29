import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Bell, ClipboardList ,Package} from 'lucide-react';

const Navbar = () => {
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 fixed top-0 left-0 right-0 z-50">
      <div className="flex flex-wrap justify-between items-center">
        {/* Navigation Links */}
        <div className="flex space-x-10 sm:space-x-6 lg:space-x-9 sm:pl-32 pl-0">
          <NavLink
            to="/workerdashboard"
            className={({ isActive }) =>
              isActive
                ? "flex items-center text-blue-600 font-medium text-sm sm:text-base border-b-2 border-blue-600"
                : "flex items-center text-gray-500 text-sm sm:text-base"
            }
          >
            <LayoutGrid className="h-5 w-5 mr-1 sm:mr-2" />
            <span>Panel</span>
          </NavLink>
          <NavLink
            to="/worker/orders"
            className={({ isActive }) =>
              isActive
                ? "flex items-center text-blue-600 font-medium text-sm sm:text-base border-b-2 border-blue-600"
                : "flex items-center text-gray-500 text-sm sm:text-base"
            }
          >
            <Package className="h-5 w-5 mr-1 sm:mr-2" />
            <span>Pedidos</span>
          </NavLink>
          <NavLink
            to="/stock"
            className={({ isActive }) =>
              isActive
                ? "flex items-center text-blue-600 font-medium text-sm sm:text-base border-b-2 border-blue-600"
                : "flex items-center text-gray-500 text-sm sm:text-base"
            }
          >
            <Bell className="h-5 w-5 mr-1 sm:mr-2" />
            <span>Inventario</span>
          </NavLink>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
