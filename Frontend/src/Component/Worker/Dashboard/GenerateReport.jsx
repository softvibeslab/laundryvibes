import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';

function GenerateReport({isOpen,onClose,pending,total,completed}) {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center px-2 justify-center bg-black bg-opacity-50">   
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Generar informe diario</h2>
          </div>
          <button
          onClick={onClose}
          aria-label="Cerrar"
          className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Statistics */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-blue-700 font-medium mb-4">Estadísticas de hoy</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{total}</p>
                <p className="text-sm text-blue-600">Total de pedidos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{completed}</p>
                <p className="text-sm text-green-600">Completados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{pending}</p>
                <p className="text-sm text-amber-600">Pendientes</p>
              </div>
            </div>
          </div>

          {/* Consumption */}
          {/* <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-green-700 font-medium mb-4">Consumo de hoy</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Premium Detergent</span>
                <span className="font-medium">0 kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Industrial Cleaner</span>
                <span className="font-medium">0 L</span>
              </div>
            </div>
          </div> */}

          {/* Notes */}
          <div>
            <h3 className="text-gray-700 font-medium mb-2">Notas adicionales</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade cualquier nota u observación importante..."
              className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 space-y-4">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            <FileText className="w-5 h-5" />
            Generar informe
          </button>
          <p className="text-center text-sm text-gray-500">
            Este informe incluirá las estadísticas de pedidos de hoy, el consumo de inventario y tus notas
          </p>
        </div>
      </div>
    </div>
  );
}

export default GenerateReport;