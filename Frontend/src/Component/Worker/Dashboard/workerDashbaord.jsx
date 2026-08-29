import React, { useEffect, useState,useContext } from 'react';
import Navbar from '../Navbar/Navbar';
import LoaderM from '../../../assets/loader/loader';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
// import { OrderContext } from '../../User/SubmitOrder/OrderContext';
import NewOrder from './NewOrder';
import GenerateReport from './GenerateReport';


import {
  ClipboardList,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  FileText,
  RefreshCw,
  Settings,
  Send,
  ChevronRight,
  Package
} from 'lucide-react';
import axios from 'axios';

const getMostRecentOrderByStatus  = (orders,status) => {
  if (!orders || orders.length === 0) {
    return null;
  }

  // Filter orders by date and time in descending order and get the first order
  const filteredOrders  = orders
  .filter(order => status ? order.status === status : true) // If status is provided, filter by it, otherwise get any order
  .sort((a, b) => {
    const dateA = new Date(a.createdAt || `${a.date} ${a.time}`);
    const dateB = new Date(b.createdAt || `${b.date} ${b.time}`);
    return dateB - dateA;
  });

  return filteredOrders.length > 0 ? filteredOrders[0] : null;
};

function WorkerDashbaord() {

  const[orders,setOrders]=useState([]);
  const[totalOrders,setTotalOrders]=useState(0);
  const[pendingOrders,setPendingOrders]=useState(0);
  const[completeOrders,setCompleteOrders]=useState(0);  
  const[complitionRate,setComplitionRate]=useState(0);
  const[mostRecentNewOrder,setMostRecentNewOrder]=useState(null);
  const [mostRecentCompletedOrder, setMostRecentCompletedOrder] = useState(null);
  const[loading,setLoading]=useState(false);
  const[timeAgo,setTimeAgo]=useState({
    newOrder: "",
    completedOrder: ""
  });


  // Navigation Buttons
  const [isNewOrderOpen, setNewOrderOpen] = useState(false);
  const [isGenerateReportOpen, setGenerateReportOpen] = useState(false);

 
  const fetchDetails = async () => {
    setLoading(true);
    try{
      const response = await axios.get("/api/worker/getallorderdetails");
      
      // Set all orders data
      setOrders(response.data.orders || []);
      setCompleteOrders(response.data.completedOrders);
      setPendingOrders(response.data.pendingOrders);
      setTotalOrders(response.data.totalOrders);

      // Get the most recent orders
      const recentNewOrder = getMostRecentOrderByStatus(response.data.orders);
      const recentCompletedOrder = getMostRecentOrderByStatus(response.data.orders, 'Completed');
      
      // Store the entire order objects
      setMostRecentNewOrder(recentNewOrder);
      setMostRecentCompletedOrder(recentCompletedOrder);
      
      // Calculate time ago for both orders
      if (recentNewOrder) {
        const orderDate = new Date(recentNewOrder.createdAt || `${recentNewOrder.date} ${recentNewOrder.time}`);
        setTimeAgo(prev => ({
          ...prev,
          newOrder: formatDistanceToNow(orderDate, { addSuffix: true, locale: es })
        }));
      }
      
      if (recentCompletedOrder) {
        const completedDate = new Date(recentCompletedOrder.createdAt || `${recentCompletedOrder.date} ${recentCompletedOrder.time}`);
        setTimeAgo(prev => ({
          ...prev,
          completedOrder: formatDistanceToNow(completedDate, { addSuffix: true, locale: es })
        }));
      }
      
    } catch(error) {
      console.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDetails();
  }, []);

  useEffect(() => {
    if(totalOrders > 0) {
      setComplitionRate((completeOrders/totalOrders) * 100);
    }
  }, [totalOrders, completeOrders]);


  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100">     
        <LoaderM />
      </div>
    );
  }


  return (
    <>
      <div>
        <Navbar />
      </div>
      <div className="min-h-screen bg-gray-50 pt-12">
        {/* Main Content */}
        <main className="p-6 max-w-7xl mx-auto">
          {/* Enviar informe Button */}
          <div className="flex justify-end mb-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-2 sm:px-4 sm:py-2 rounded-md flex items-center justify-center text-sm sm:text-base w-32 sm:w-auto">
              <Send className="h-4 w-4 mr-2" />
              <span className="ml-1">Enviar informe</span>
            </button>
          </div>




          {/* Greeting Card */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div className="flex-1 sm:mb-0">
              <h1 className="text-2xl font-bold text-gray-800">Buenas tardes</h1>
              <p className="text-gray-600 flex items-center mt-1">
                <ClipboardList className="h-4 w-4 mr-2" />
                {new Date().toLocaleDateString("es-MX", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
              </p>
            </div>
            {/* <div className="text-right flex-1 sm:flex sm:flex-col sm:items-end">
              <p className="font-medium text-gray-800">John Worker</p>
              <p className="text-gray-600 text-sm">Floor Manager</p>
            </div> */}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total de pedidos */}
            <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-gray-500 mb-2">Total de pedidos</p>
             <Package className="h-5 w-5 text-blue-500" />
              </div>

              <p className="text-4xl font-bold ">{totalOrders}</p>
            </div>

            {/* Pedidos completados */}
            <div className="bg-white rounded-lg p-6 border-l-4 border-green-500 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 mb-2">Pedidos completados</p>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-4xl font-bold">{completeOrders}</p>
            </div>

            {/* Pedidos pendientes */}
            <div className="bg-white rounded-lg p-6 border-l-4 border-yellow-500 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 mb-2">Pedidos pendientes</p>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-4xl font-bold">{pendingOrders}</p>
            </div>

            {/* Tasa de finalización */}
            <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 mb-2">Tasa de finalización</p>
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-4xl font-bold">
              {complitionRate.toFixed(2)} <span className="text-gray-400 text-2xl">%</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <button
            onClick={()=>{
              setNewOrderOpen(true);
            }} 
            
             className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg flex flex-col items-center justify-center">
              <Plus className="h-6 w-6 mb-2" />
              <span>Nuevo pedido</span>
            </button>
            <button
             onClick={()=>{
              setGenerateReportOpen(true);
            }} 
             className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg flex flex-col items-center justify-center">
              <FileText className="h-6 w-6 mb-2" />
              <span>Generar informe</span>
            </button>
            <button className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-lg flex flex-col items-center justify-center">
              <RefreshCw className="h-6 w-6 mb-2" />
              <span>Sincronizar inventario</span>
            </button>
            <button className="bg-gray-500 hover:bg-gray-600 text-white p-4 rounded-lg flex flex-col items-center justify-center">
              <Settings className="h-6 w-6 mb-2" />
              <span>Configuración</span>
            </button>
          </div>

          <NewOrder
          isOpen={isNewOrderOpen}
          onClose={()=> setNewOrderOpen(false)}
         
          />
          <GenerateReport
           isOpen={isGenerateReportOpen}
           onClose={()=> setGenerateReportOpen(false)}
           pending={pendingOrders}
           completed={completeOrders}
           total={totalOrders}
           />
          

          {/* Actividad reciente */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-medium">Actividad reciente</h2>
              </div>
              <Link to='/worker/orders' className="text-blue-500 text-sm flex items-center">
                Ver todo
                <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
            </div>

            <div className="space-y-4">
              {/* Completed Order Activity */}
              {mostRecentCompletedOrder && (
                <div className="border-b border-gray-100 pb-4">
                  <h3 className="font-medium">Pedido completado</h3>
                  <p className="text-gray-600">
                    El pedido con bolsa n.º {mostRecentCompletedOrder.bagNumber} se marcó como completado
                  </p>
                  <p className="text-gray-400 text-sm mt-1">{timeAgo.completedOrder || "Recientemente"}</p>
                </div>
              )}

              {/* Nuevo pedido Activity */}
              {mostRecentNewOrder && (
                <div>
                  <h3 className="font-medium">Nuevo pedido</h3>
                  <p className="text-gray-600">
                    Se creó el pedido con bolsa n.º {mostRecentNewOrder.bagNumber}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">{timeAgo.newOrder || "Recientemente"}</p>
                </div>
              )}

              {/* Show message if no activities */}
              {!mostRecentNewOrder && !mostRecentCompletedOrder && (
                <div>
                  <p className="text-gray-500">No hay actividad reciente para mostrar.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default WorkerDashbaord;
