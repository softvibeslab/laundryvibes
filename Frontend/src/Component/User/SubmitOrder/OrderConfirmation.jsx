import { CheckCircle, Clock} from "lucide-react";
import Sidebar from "../Sidebar";
import { Link } from "react-router-dom";
import { OrderContext } from "./OrderContext";
import { useContext } from "react";



const OrderConfirmation = () => {
const{weight ,numberofitems,bagNumber} = useContext(OrderContext);
  return (
    <div className="">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
        {/* Success Icon */}
        <CheckCircle size={80} className="text-green-500 mb-4" />

        {/* Title */}
        <h1 className="text-3xl font-bold">¡Pedido enviado!</h1>
        <p className="text-gray-500">Tu pedido de lavandería se realizó correctamente</p>

        {/* Resumen del pedido */}
        <div className="bg-white shadow-md rounded-lg p-4 mt-6 w-80">
          <div className="flex justify-between text-gray-600">
            <span>Número de bolsa</span>
            <span className="font-bold">{bagNumber}</span>
          </div>
          <div className="flex justify-between text-gray-600 mt-2">
            <span>Prendas</span>
            <span className="font-bold"> {numberofitems} pieces</span>
          </div>
          <div className="flex justify-between text-gray-600 mt-2">
            <span>Peso</span>
            <span className="font-bold">{weight} Kg</span>
          </div>
        </div>

        {/* Redirecting Message */}
        <div className="flex items-center text-gray-500 text-sm mt-4">
          <Clock size={16} className="mr-1" />
          Redirigiendo al historial de pedidos • • •
        </div>

        {/* Button */}
        <button className="bg-blue-600 text-white px-6 py-2 mt-4 rounded-lg flex items-center gap-2">
            <Link to='/user/order-history' >
          Ver historial de pedidos →
            </Link>
        </button>
      </div>
    </div>
  );
};

export default OrderConfirmation;
