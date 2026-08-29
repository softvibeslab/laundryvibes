import React, { useEffect, useState } from 'react';
import Navbar from '../Navbar/Navbar';
import LoaderM from '../../../assets/loader/loader';
import { toast, ToastContainer } from 'react-toastify';
import ToastCloseButton from '../../ToastCloseButton';
import 'react-toastify/dist/ReactToastify.css';
import {
  Plus,
  TrendingDown,
  AlertCircle,
  BarChart3,
  Droplet,
  TrendingUp,
  Clock,
  Calendar,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import axios from 'axios';
import {
  apiMessageEs,
  consumptionReasonLabel,
  formatDateEs,
  formatDateTimeEs,
  stockAlertMessageEs,
  stockItemLabel,
  stockStatusLabel,
  stockUnitLabel,
} from '../../../utils/localization';

const Stock = () => {
  const [stockItems, setStockItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [expandedItem, setExpandedItem] = useState(null);

  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  const [consumptionForm, setConsumptionForm] = useState({
    quantityUsed: '',
    reason: 'Daily Consumption',
  });

  const [restockForm, setRestockForm] = useState({
    quantityToAdd: '',
    notes: '',
  });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [stockRes, analyticsRes, alertsRes] = await Promise.all([
        axios.get('/api/stock/all'),
        axios.get('/api/stock/analytics'),
        axios.get('/api/stock/alerts'),
      ]);

      setStockItems(stockRes.data.data || []);
      setAnalytics(analyticsRes.data.data || {});
      setAlerts(alertsRes.data.data || []);
      
      if (['Initial stock items created', 'Artículos iniciales del inventario creados'].includes(stockRes.data.message)) {
        toast.success('✅ Inventario inicializado con 5 insumos predeterminados (Detergente, Jabón, Suavizante, Lejía y Almidón)', {
          position: 'top-right',
          autoClose: 4000,
        });
      }
    } catch (error) {
      console.error('Error al obtener los datos:', error.response?.data?.message || error.message);
      toast.error('⚠️ No se pudieron cargar los datos del inventario. Comprueba tu conexión e inténtalo de nuevo.', {
        position: 'top-right',
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRecordConsumption = async () => {
    if (!consumptionForm.quantityUsed || !selectedStock) {
      toast.warning('⚠️ Ingresa la cantidad utilizada para registrarla', {
        position: 'top-right',
        autoClose: 2500,
      });
      return;
    }

    const quantity = parseFloat(consumptionForm.quantityUsed);
    const remaining = selectedStock.currentQuantity - quantity;

    const toastId = toast.loading('⏳ Registrando datos de consumo...', {
      position: 'top-right',
    });

    try {
      const response = await axios.post(
        `/api/stock/${selectedStock._id}/consume`,
        {
          quantityUsed: quantity,
          reason: consumptionForm.reason,
        }
      );

      let warningMsg = '';
      let alertNotification = '';
      
      if (response.data.alertTriggered) {
        alertNotification = '\n🔔 ⚠️ ALERTA ACTIVADA: ¡El inventario está por debajo del nivel de reposición!';
        warningMsg = ` ⚠️ ¡Nivel CRÍTICO! Solo quedan ${remaining.toFixed(2)} ${stockUnitLabel(selectedStock.unit)}.`;
      } else if (remaining <= selectedStock.reorderLevel) {
        warningMsg = ` ⚠️ ¡Nivel BAJO! Solo quedan ${remaining.toFixed(2)} ${stockUnitLabel(selectedStock.unit)}.`;
      } else if (remaining <= selectedStock.reorderLevel * 1.5) {
        warningMsg = ` ⚠️ El inventario se está agotando. Solo quedan ${remaining.toFixed(2)} ${stockUnitLabel(selectedStock.unit)}.`;
      }

      toast.update(toastId, {
        render: `✅ Consumo registrado\n📉 Utilizado: ${quantity} ${stockUnitLabel(selectedStock.unit)}\n📦 Restante: ${remaining.toFixed(2)} ${stockUnitLabel(selectedStock.unit)}${warningMsg}${alertNotification}`,
        type: response.data.alertTriggered ? 'warning' : 'success',
        isLoading: false,
        autoClose: 4000,
      });

      setConsumptionForm({ quantityUsed: '', reason: 'Daily Consumption' });
      setShowConsumptionModal(false);
      setSelectedStock(null);
      await fetchAllData();
    } catch (error) {
      const errorMsg = apiMessageEs(error.response?.data?.message, 'No se pudo registrar el consumo');
      toast.update(toastId, {
        render: `❌ Error al registrar\n${errorMsg}`,
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
    }
  };

  const handleAddStock = async () => {
    if (!restockForm.quantityToAdd || !selectedStock) {
      toast.warning('⚠️ Ingresa la cantidad que deseas añadir', {
        position: 'top-right',
        autoClose: 2500,
      });
      return;
    }

    const quantity = parseFloat(restockForm.quantityToAdd);
    const newTotal = selectedStock.currentQuantity + quantity;

    const toastId = toast.loading('⏳ Procesando reposición...', {
      position: 'top-right',
    });

    try {
      const response = await axios.post(
        `/api/stock/${selectedStock._id}/add`,
        {
          quantityToAdd: quantity,
          notes: restockForm.notes,
        }
      );

      let notificationMsg = '';
      if (response.data.alertsResolved && response.data.alertsResolved > 0) {
        notificationMsg = response.data.alertsResolved === 1
          ? '\n🔔 Se resolvió 1 alerta: ¡el inventario vuelve a estar en un nivel adecuado!'
          : `\n🔔 Se resolvieron ${response.data.alertsResolved} alertas: ¡el inventario vuelve a estar en un nivel adecuado!`;
      }

      const statusMsg = newTotal > selectedStock.reorderLevel * 2 
        ? '✅ El inventario está ahora en un nivel adecuado'
        : newTotal > selectedStock.reorderLevel
        ? '⚠️ El inventario es suficiente, pero debe supervisarse el consumo'
        : '⚠️ El inventario continúa por debajo del nivel óptimo';

      toast.update(toastId, {
        render: `✅ Reposición completada\n📦 Añadido: ${quantity} ${stockUnitLabel(selectedStock.unit)}\n📈 Total: ${newTotal.toFixed(2)} ${stockUnitLabel(selectedStock.unit)}\n${statusMsg}${notificationMsg}`,
        type: 'success',
        isLoading: false,
        autoClose: 4000,
      });

      setRestockForm({ quantityToAdd: '', notes: '' });
      setShowAddStockModal(false);
      setSelectedStock(null);
      await fetchAllData();
    } catch (error) {
      const errorMsg = apiMessageEs(error.response?.data?.message, 'No se pudo añadir inventario');
      toast.update(toastId, {
        render: `❌ Error en la reposición\n${errorMsg}`,
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Low':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'Medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'High':
        return 'bg-green-50 border-green-200 text-green-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Low':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'Medium':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'High':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      default:
        return <Droplet className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
        <LoaderM />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-20">
        <main className="p-6 max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 mb-6 border border-blue-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
                  <Droplet className="h-8 w-8 mr-3 text-blue-600" />
                  Gestión de inventario
                </h1>
                <p className="text-gray-600 mt-2">Controla y gestiona tu inventario de forma eficiente</p>
              </div>
              <button
                onClick={() => {
                  setShowAddStockModal(true);
                  setSelectedStock(null);
                  setRestockForm({ quantityToAdd: '', notes: '' });
                }}
                className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center w-full sm:w-auto"
              >
                <Plus className="h-5 w-5 mr-2" />
                Añadir inventario
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['overview', 'analytics', 'alerts', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSelectedTab(tab);
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                  selectedTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {{ overview: 'Resumen', analytics: 'Análisis', alerts: 'Alertas', history: 'Historial' }[tab]}
              </button>
            ))}
          </div>

          {selectedTab === 'overview' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
                  <p className="text-gray-500 text-sm mb-2">Total de insumos</p>
                  <p className="text-3xl font-bold text-gray-800">{analytics?.totalItems || 0}</p>
                </div>

                <div className="bg-white rounded-lg p-4 border-l-4 border-red-500 shadow-sm">
                  <p className="text-gray-500 text-sm mb-2">Inventario bajo</p>
                  <p className="text-3xl font-bold text-red-600">
                    {analytics?.lowStockItems?.length || 0}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500 shadow-sm">
                  <p className="text-gray-500 text-sm mb-2">Inventario medio</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {analytics?.mediumStockItems?.length || 0}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm">
                  <p className="text-gray-500 text-sm mb-2">Consumo de hoy</p>
                  <p className="text-3xl font-bold text-green-600">
                    {analytics?.totalConsumptionToday?.toFixed(2) || 0}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {stockItems.length > 0 ? (
                  stockItems.map((item) => (
                    <div
                      key={item._id}
                      className={`bg-white rounded-lg border-2 shadow-sm overflow-hidden ${getStatusColor(
                        item.status
                      )}`}
                    >
                      <div
                        className="p-4 cursor-pointer flex items-center justify-between"
                        onClick={() =>
                          setExpandedItem(expandedItem === item._id ? null : item._id)
                        }
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {getStatusIcon(item.status)}
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{stockItemLabel(item.itemName)}</h3>
                            <p className="text-sm opacity-75">
                              {item.currentQuantity} {stockUnitLabel(item.unit)} • Estado: {stockStatusLabel(item.status)}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 transition transform ${
                            expandedItem === item._id ? 'rotate-180' : ''
                          }`}
                        />
                      </div>

                      {expandedItem === item._id && (
                        <div className="bg-white border-t p-4">
                          <div className="mb-4">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Nivel de inventario</span>
                              <span className="text-sm text-gray-600">
                                {((item.currentQuantity / (item.reorderLevel * 3)) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full ${
                                  item.status === 'High'
                                    ? 'bg-green-500'
                                    : item.status === 'Medium'
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (item.currentQuantity / (item.reorderLevel * 3)) * 100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Nivel de reposición</p>
                              <p className="font-semibold text-gray-800">
                                {item.reorderLevel} {stockUnitLabel(item.unit)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Promedio diario</p>
                              <p className="font-semibold text-gray-800">
                                {item.averageDailyConsumption?.toFixed(2) || 0} {stockUnitLabel(item.unit)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Última reposición</p>
                              <p className="font-semibold text-gray-800 text-sm">
                                {new Date(item.lastRestockDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Agotamiento estimado</p>
                              <p className="font-semibold text-gray-800 text-sm">
                                {item.estimatedDepletionDate
                                  ? formatDateEs(item.estimatedDepletionDate, { dateStyle: 'medium' })
                                  : 'No disponible'}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedStock(item);
                                setConsumptionForm({
                                  quantityUsed: '',
                                  reason: 'Daily Consumption',
                                });
                                setShowConsumptionModal(true);
                              }}
                              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2"
                            >
                              <TrendingDown className="h-4 w-4" />
                              Registrar consumo
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStock(item);
                                setRestockForm({ quantityToAdd: '', notes: '' });
                                setShowAddStockModal(true);
                              }}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Reponer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No se encontraron insumos</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'analytics' && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 shadow-md border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-purple-900">Consumo total de hoy</h3>
                    <TrendingDown className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-4xl font-bold text-purple-700 mb-2">
                    {analytics?.totalConsumptionToday?.toFixed(1) || 0}
                  </p>
                  <p className="text-sm text-purple-600">Combinado entre todos los insumos</p>
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <p className="text-xs text-purple-600">
                      📊 Controla tus patrones de consumo diario para optimizar los niveles de inventario
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 shadow-md border border-red-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-red-900">Insumos críticos</h3>
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="text-4xl font-bold text-red-700 mb-2">
                    {analytics?.lowStockItems?.length || 0}
                  </p>
                  <p className="text-sm text-red-600">Insumos por debajo del nivel de reposición</p>
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <p className="text-xs text-red-600">
                      ⚠️ Se requiere una acción inmediata: repón estos insumos
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-md border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-green-900">Insumos en nivel adecuado</h3>
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-4xl font-bold text-green-700 mb-2">
                    {analytics?.highStockItems?.length || 0}
                  </p>
                  <p className="text-sm text-green-600">Insumos en condiciones óptimas</p>
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-xs text-green-600">
                      ✅ Los niveles de inventario son adecuados y están bien gestionados
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                  <h3 className="font-bold text-lg mb-6 flex items-center">
                    <BarChart3 className="h-6 w-6 mr-3 text-blue-600" />
                    Desglose del consumo diario
                  </h3>
                  <div className="space-y-4">
                    {stockItems.length > 0 ? (
                      stockItems.map((item) => {
                        const avgDaily = item.averageDailyConsumption || 0;
                        const maxConsumption = Math.max(...stockItems.map(i => i.averageDailyConsumption || 0), 1);
                        return (
                          <div key={item._id} className="group">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-800">{stockItemLabel(item.itemName)}</span>
                              <div className="text-right">
                                <span className="text-sm font-bold text-blue-600">{avgDaily.toFixed(2)}</span>
                                <span className="text-xs text-gray-500 ml-1">{stockUnitLabel(item.unit)}/día</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all group-hover:from-blue-500 group-hover:to-blue-700"
                                style={{
                                  width: `${Math.min(100, (avgDaily / maxConsumption) * 100)}%`,
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Con el consumo actual: {item.currentQuantity > 0 ? (item.currentQuantity / avgDaily).toFixed(1) : '∞'} días de existencias restantes
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-sm">No hay datos de consumo disponibles</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                  <h3 className="font-bold text-lg mb-6 flex items-center">
                    <BarChart3 className="h-6 w-6 mr-3 text-green-600" />
                    Resumen del estado del inventario
                  </h3>
                  <div className="space-y-5">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-semibold text-gray-800">Inventario adecuado</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">
                          {analytics?.highStockItems?.length || 0}/{analytics?.totalItems || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${(
                              ((analytics?.highStockItems?.length || 0) / (analytics?.totalItems || 1)) * 100
                            ).toFixed(0)}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-green-600 mt-2">✅ Insumos en condiciones óptimas</p>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="font-semibold text-gray-800">Supervisar de cerca</span>
                        </div>
                        <span className="text-lg font-bold text-yellow-600">
                          {analytics?.mediumStockItems?.length || 0}/{analytics?.totalItems || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${(
                              ((analytics?.mediumStockItems?.length || 0) / (analytics?.totalItems || 1)) * 100
                            ).toFixed(0)}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-yellow-600 mt-2">⚠️ Repón pronto para mantener las existencias</p>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="font-semibold text-gray-800">Nivel crítico</span>
                        </div>
                        <span className="text-lg font-bold text-red-600">
                          {analytics?.lowStockItems?.length || 0}/{analytics?.totalItems || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${(
                              ((analytics?.lowStockItems?.length || 0) / (analytics?.totalItems || 1)) * 100
                            ).toFixed(0)}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-red-600 mt-2">🚨 Se requiere una acción inmediata</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'alerts' && (
            <div>
              {alerts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-500 p-3 rounded-lg">
                          <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-red-600">Alertas críticas</p>
                          <p className="text-2xl font-bold text-red-700">
                            {alerts.filter(a => a.severity === 'critical' && !a.isResolved).length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-center gap-3">
                        <div className="bg-yellow-500 p-3 rounded-lg">
                          <AlertCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-yellow-600">Advertencias</p>
                          <p className="text-2xl font-bold text-yellow-700">
                            {alerts.filter(a => a.severity === 'warning' && !a.isResolved).length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500 p-3 rounded-lg">
                          <AlertCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-blue-600">Alertas activas</p>
                          <p className="text-2xl font-bold text-blue-700">
                            {alerts.filter(a => !a.isResolved).length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500 p-3 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-green-600">Resueltas</p>
                          <p className="text-2xl font-bold text-green-700">
                            {alerts.filter(a => a.isResolved).length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {alerts.filter(a => !a.isResolved).length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          Alertas activas
                        </h3>
                        <div className="space-y-3">
                          {alerts
                            .filter(a => !a.isResolved)
                            .sort((a, b) => {
                              if (a.severity === 'critical' && b.severity !== 'critical') return -1;
                              if (a.severity !== 'critical' && b.severity === 'critical') return 1;
                              return new Date(b.date) - new Date(a.date);
                            })
                            .map((alert, idx) => (
                              <div
                                key={idx}
                                className={`rounded-lg p-5 border-l-4 shadow-sm transition hover:shadow-md ${
                                  alert.severity === 'critical'
                                    ? 'bg-red-50 border-red-500'
                                    : 'bg-yellow-50 border-yellow-500'
                                }`}
                              >
                                <div className="flex items-start gap-4">
                                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                                    alert.severity === 'critical'
                                      ? 'bg-red-200'
                                      : 'bg-yellow-200'
                                  }`}>
                                    {alert.severity === 'critical' ? (
                                      <AlertTriangle className={`h-5 w-5 ${alert.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'}`} />
                                    ) : (
                                      <AlertCircle className={`h-5 w-5 ${alert.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'}`} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-bold text-gray-900 text-lg">{stockItemLabel(alert.itemName)}</p>
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        alert.severity === 'critical'
                                          ? 'bg-red-200 text-red-800'
                                          : 'bg-yellow-200 text-yellow-800'
                                      }`}>
                                        {alert.severity === 'critical' ? '🚨 CRÍTICO' : '⚠️ ADVERTENCIA'}
                                      </span>
                                    </div>
                                    
                                    <p className={`mt-2 font-medium ${
                                      alert.severity === 'critical'
                                        ? 'text-red-800'
                                        : 'text-yellow-800'
                                    }`}>
                                      {stockAlertMessageEs(alert.message, alert.itemName)}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                                      <div className="bg-white bg-opacity-60 rounded p-2">
                                        <p className="text-xs text-gray-600">Nivel actual</p>
                                        <p className="font-bold text-gray-900">{alert.currentQuantity} {alert.itemName === 'Detergent' || alert.itemName === 'Fabric Softener' || alert.itemName === 'Bleach' ? 'L' : 'kg'}</p>
                                      </div>
                                      <div className="bg-white bg-opacity-60 rounded p-2">
                                        <p className="text-xs text-gray-600">Nivel de reposición</p>
                                        <p className="font-bold text-gray-900">{alert.reorderLevel} {alert.itemName === 'Detergent' || alert.itemName === 'Fabric Softener' || alert.itemName === 'Bleach' ? 'L' : 'kg'}</p>
                                      </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                                      <Clock className="h-3 w-3" />
                                      <span>Alerta generada: {formatDateTimeEs(alert.date)}</span>
                                    </div>

                                    {alert.severity === 'critical' && (
                                      <div className="mt-3 bg-red-100 border border-red-300 rounded px-3 py-2">
                                        <p className="text-sm font-semibold text-red-800">
                                          ⚠️ Acción requerida: repón este insumo inmediatamente para evitar interrupciones
                                        </p>
                                      </div>
                                    )}
                                    {alert.severity === 'warning' && (
                                      <div className="mt-3 bg-yellow-100 border border-yellow-300 rounded px-3 py-2">
                                        <p className="text-sm font-semibold text-yellow-800">
                                          ⚠️ Supervisar de cerca: el inventario se está agotando; planifica una reposición pronto
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {alerts.filter(a => a.isResolved).length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          Alertas resueltas
                        </h3>
                        <div className="space-y-3">
                          {alerts
                            .filter(a => a.isResolved)
                            .sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt))
                            .map((alert, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg p-5 border-l-4 border-green-300 shadow-sm bg-green-50 opacity-75"
                              >
                                <div className="flex items-start gap-4">
                                  <div className="p-2 rounded-lg flex-shrink-0 bg-green-200">
                                    <CheckCircle className="h-5 w-5 text-green-700" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-bold text-gray-900 text-lg line-through text-gray-600">{stockItemLabel(alert.itemName)}</p>
                                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-800">
                                        ✅ RESUELTA
                                      </span>
                                    </div>
                                    
                                    <p className="mt-2 font-medium text-gray-700 line-through">
                                      {stockAlertMessageEs(alert.message, alert.itemName)}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                                      <div className="bg-white bg-opacity-60 rounded p-2">
                                        <p className="text-xs text-gray-600">Nivel final</p>
                                        <p className="font-bold text-gray-900">{alert.currentQuantity} {alert.itemName === 'Detergent' || alert.itemName === 'Fabric Softener' || alert.itemName === 'Bleach' ? 'L' : 'kg'}</p>
                                      </div>
                                      <div className="bg-white bg-opacity-60 rounded p-2">
                                        <p className="text-xs text-gray-600">Nivel de reposición</p>
                                        <p className="font-bold text-gray-900">{alert.reorderLevel} {alert.itemName === 'Detergent' || alert.itemName === 'Fabric Softener' || alert.itemName === 'Bleach' ? 'L' : 'kg'}</p>
                                      </div>
                                    </div>

                                    <div className="mt-3 flex flex-col gap-1 text-xs text-gray-600">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        <span>Alerta generada: {formatDateTimeEs(alert.date)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-3 w-3" />
                                        <span>Resuelta: {formatDateTimeEs(alert.resolvedAt)}</span>
                                      </div>
                                    </div>

                                    <div className="mt-3 bg-green-100 border border-green-300 rounded px-3 py-2">
                                      <p className="text-sm font-semibold text-green-800">
                                        ✅ Inventario repuesto: la alerta ya no está activa
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-12 text-center border border-green-200">
                  <div className="mb-4 flex justify-center">
                    <div className="bg-green-500 p-4 rounded-full">
                      <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-900 mb-2">¡Todo en orden! ✅</p>
                  <p className="text-green-700 mb-1">No hay alertas activas en este momento</p>
                  <p className="text-sm text-green-600">Todos los niveles de inventario son adecuados y están bien gestionados. ¡Sigue así!</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'history' && (
            <div>
              <div className="space-y-4">
                {stockItems.map((item) => (
                  <div key={item._id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                      {stockItemLabel(item.itemName)} - Historial de consumo
                    </h3>
                    {item.consumptionHistory && item.consumptionHistory.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {item.consumptionHistory
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((entry, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-800">
                                    {consumptionReasonLabel(entry.reason)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDateTimeEs(entry.date)}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-gray-800">
                                -{entry.quantityUsed} {stockUnitLabel(item.unit)}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No hay historial de consumo</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {showAddStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Añadir inventario</h2>
              <button
                onClick={() => {
                  setShowAddStockModal(false);
                  setSelectedStock(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {selectedStock ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Insumo</p>
                  <p className="text-lg font-bold text-gray-800">{stockItemLabel(selectedStock.itemName)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Cantidad que añadir ({stockUnitLabel(selectedStock.unit)})
                  </label>
                  <input
                    type="number"
                    placeholder="Ingresa la cantidad"
                    value={restockForm.quantityToAdd}
                    onChange={(e) =>
                      setRestockForm({ ...restockForm, quantityToAdd: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Notas (opcionales)
                  </label>
                  <textarea
                    placeholder="Añade notas..."
                    value={restockForm.notes}
                    onChange={(e) =>
                      setRestockForm({ ...restockForm, notes: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddStockModal(false);
                      setSelectedStock(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddStock}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Añadir inventario
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {stockItems.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => {
                      setSelectedStock(item);
                      setRestockForm({ quantityToAdd: '', notes: '' });
                    }}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
                  >
                    <p className="font-medium text-gray-800">{stockItemLabel(item.itemName)}</p>
                    <p className="text-sm text-gray-600">
                      Actual: {item.currentQuantity} {stockUnitLabel(item.unit)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showConsumptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Registrar consumo</h2>
              <button
                onClick={() => {
                  setShowConsumptionModal(false);
                  setSelectedStock(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Insumo</p>
                <p className="text-lg font-bold text-gray-800">{stockItemLabel(selectedStock?.itemName)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Disponible: {selectedStock?.currentQuantity} {stockUnitLabel(selectedStock?.unit)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Cantidad utilizada ({stockUnitLabel(selectedStock?.unit)})
                </label>
                <input
                  type="number"
                  placeholder="Ingresa la cantidad"
                  value={consumptionForm.quantityUsed}
                  onChange={(e) =>
                    setConsumptionForm({ ...consumptionForm, quantityUsed: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Motivo</label>
                <select
                  value={consumptionForm.reason}
                  onChange={(e) =>
                    setConsumptionForm({ ...consumptionForm, reason: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Daily Consumption">Consumo diario</option>
                  <option value="Spillage">Derrame</option>
                  <option value="Waste">Desperdicio</option>
                  <option value="Other">Otro</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConsumptionModal(false);
                    setSelectedStock(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRecordConsumption}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer
        aria-label="Notificaciones"
        closeButton={ToastCloseButton}
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default Stock;
