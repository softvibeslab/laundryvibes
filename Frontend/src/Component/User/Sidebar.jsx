import React, { useState } from "react";
import { MdOutlineDashboard } from "react-icons/md";
import { RiTShirt2Line } from "react-icons/ri";
import { RiHistoryFill } from "react-icons/ri";
import { FaRegChartBar } from "react-icons/fa";
import { RiAccountCircleLine } from "react-icons/ri";
import { CiWarning } from "react-icons/ci";
import { NavLink, Link,useNavigate } from "react-router-dom";
import { LogOut } from 'lucide-react'
import { toast,ToastContainer } from "react-toastify"; 
import 'react-toastify/dist/ReactToastify.css';
import ToastCloseButton from '../ToastCloseButton';


function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  // handle logout
const navigate =useNavigate();
  const logout =()=>{
    localStorage.removeItem("token");
    setIsOpen(false)
    toast.success("Sesión cerrada correctamente");

    setTimeout(()=>{
      navigate('/login')
    },2000)
  }

  return (
    <>
    <ToastContainer aria-label="Notificaciones" closeButton={ToastCloseButton} />
    <div className="relative">
      {/* Hamburger Menu */}
      <button
        onClick={toggleSidebar}
        className="block md:hidden p-4 text-gray-700 focus:outline-none"
      >
        {/* Hamburger Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <div className="flex flex-col h-full">     
         <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform z-20 ${isOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 md:translate-x-0`}
      >
        {/* Header */}
        <div className="p-6 px-8">
          <h1 className="text-2xl font-bold text-black">LaundryVibes</h1>
        </div>

        {/* Menu */}
        <nav className="mt-4">
          <ul>
            <NavLink
              to="/user/userdashboard"
              className={({ isActive }) =>
                `flex items-center p-3 px-8 rounded-lg cursor-pointer ${isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-xl mr-4">
                <MdOutlineDashboard />
              </span>
              <span>Panel</span>
            </NavLink>

            <NavLink
              to="/user/submit-order"
              className={({ isActive }) =>
                `flex items-center p-3 px-8 rounded-lg cursor-pointer ${isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-xl mr-4">
                <RiTShirt2Line />
              </span>
              <span>Realizar pedido</span>
            </NavLink>

            <NavLink
              to="/user/order-history"
              className={({ isActive }) =>
                `flex items-center p-3 px-8 rounded-lg cursor-pointer ${isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-xl mr-4">
                <RiHistoryFill />
              </span>
              <span> Historial de pedidos</span>
            </NavLink>

            <NavLink
              to="/user/daily-rush"
              className={({ isActive }) =>
                `flex items-center p-3 px-8 rounded-lg cursor-pointer ${isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-xl mr-4">
                <FaRegChartBar />
              </span>
              <span>Horas de mayor demanda</span>
            </NavLink>

            <NavLink
              to="/user/profile"
              className={({ isActive }) =>
                `flex items-center p-3 px-8 rounded-lg cursor-pointer ${isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-xl mr-4">
                <RiAccountCircleLine />
              </span>

              <span>Perfil</span>
            </NavLink>

            <NavLink
              to="/user/complaint"
              className={({ isActive }) =>
                `flex items-center p-3 px-8 rounded-lg cursor-pointer ${isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-xl mr-4">
                <CiWarning />              </span>
              <span>Reclamación</span>
            </NavLink>
          </ul>
        </nav>
        <div className="mt-auto p-4 border-t border-gray-200">
          <button
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          onClick={logout}>
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar sesión
          </button>
        </div>
      </div>
      </div>
    </div>
    </>
  );
}

export default Sidebar;
