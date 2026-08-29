import React from 'react';
import { X, Calendar, User, Phone, MapPin } from 'lucide-react';

function NewOrder({isOpen,onClose}) {


  if (!isOpen) return null;

  return (
  <div >
    <div className="fixed inset-0 z-50 flex items-center px-2 justify-center bg-black bg-opacity-50">   
       <div className="bg-white rounded-2xl w-full max-w-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Crear nuevo pedido</h2>
                <p className="text-gray-500 text-sm">Completa los datos del nuevo pedido</p>
              </div>
            </div>
            <button 
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del cliente
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ingresa el nombre del cliente"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ingresa el número de teléfono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección de entrega
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingresa la dirección de entrega"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de entrega
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  lang="es"
                  aria-label="Fecha de entrega"
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="dd-mm-yyyy"
                />
                {/* <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /> */}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas adicionales
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Cualquier instrucción especial..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span>
              <span>Crear pedido</span>
            </button>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}

export default NewOrder;