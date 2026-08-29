// NotifyAndComplete.jsx
import { useState } from "react";
import { CheckCircle } from "lucide-react";
import axios from 'axios'
import { apiMessageEs } from '../../../utils/localization';

function NotifyAndComplete({ isOpen, onClose, order, fetchOrders }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null; // Only render if isOpen is true

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {

      await axios.patch(`/api/worker/update-order-status/${order?.OrderId}`,
        {},
         {
          headers: {
            'Content-Type': 'application/json', // Set the Content-Type header
          },
        }
      );
      
      
      
      // Ensure fetchOrders is called after successful update
      await fetchOrders();
      
      // Close modal after successful submission and data refresh
      onClose();
      
    } catch (error) {
      console.error("Error updating order status:", {
        message: apiMessageEs(error.message, 'No se pudo actualizar el pedido'),
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(apiMessageEs(error.response?.data?.message, "No se pudo actualizar el estado del pedido. Inténtalo de nuevo."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <span className="text-2xl">×</span>
        </button>
        <div className="flex items-center mb-4">
          <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
          <h2 className="text-lg font-semibold">Completar pedido</h2>
        </div>
        <p className="text-gray-600 mb-4">Marcar como completado y notificar al cliente</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">Detalles del pedido</h3>
            <div className="bg-blue-50 p-4 rounded-md">
              <p>Número de bolsa: #{order?.bagNumber || "No disponible"}</p>
              <p>Cliente: {order?.userName || "No disponible"}</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de bolsa</label>
            <input
              type="text"
              defaultValue={order?.bagNumber || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingresa el número de bolsa"
              disabled
            />
          </div>

          <p className="mb-4 text-sm text-gray-600">
            El servidor enviará al cliente la notificación de finalización configurada.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full ${isSubmitting ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white px-4 py-2 rounded-md flex items-center justify-center`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" /> Completar y notificar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default NotifyAndComplete;
