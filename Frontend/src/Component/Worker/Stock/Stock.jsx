import React, { useEffect, useState } from 'react';
import Navbar from '../Navbar/Navbar';
import LoaderM from '../../../assets/loader/loader';
import { toast, ToastContainer } from 'react-toastify';
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
      
      if (stockRes.data.message === 'Initial stock items created') {
        toast.success('✅ Stock initialized with 5 default items (Detergent, Soap, Fabric Softener, Bleach, Starch)', {
          position: 'top-right',
          autoClose: 4000,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error.response?.data?.message || error.message);
      toast.error('⚠️ Unable to load stock data. Please check your connection and try again.', {
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
      toast.warning('⚠️ Please enter the quantity used for tracking', {
        position: 'top-right',
        autoClose: 2500,
      });
      return;
    }

    const quantity = parseFloat(consumptionForm.quantityUsed);
    const remaining = selectedStock.currentQuantity - quantity;

    const toastId = toast.loading('⏳ Recording consumption data...', {
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
        alertNotification = '\n🔔 ⚠️ ALERT TRIGGERED: Stock below reorder level!';
        warningMsg = ` ⚠️ Stock now CRITICAL! Only ${remaining.toFixed(2)} ${selectedStock.unit} left.`;
      } else if (remaining <= selectedStock.reorderLevel) {
        warningMsg = ` ⚠️ Stock now LOW! Only ${remaining.toFixed(2)} ${selectedStock.unit} left.`;
      } else if (remaining <= selectedStock.reorderLevel * 1.5) {
        warningMsg = ` ⚠️ Stock getting low. Only ${remaining.toFixed(2)} ${selectedStock.unit} remaining.`;
      }

      toast.update(toastId, {
        render: `✅ Consumption Recorded\n📉 Used: ${quantity} ${selectedStock.unit}\n📦 Remaining: ${remaining.toFixed(2)} ${selectedStock.unit}${warningMsg}${alertNotification}`,
        type: response.data.alertTriggered ? 'warning' : 'success',
        isLoading: false,
        autoClose: 4000,
      });

      setConsumptionForm({ quantityUsed: '', reason: 'Daily Consumption' });
      setShowConsumptionModal(false);
      setSelectedStock(null);
      await fetchAllData();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Unable to record consumption';
      toast.update(toastId, {
        render: `❌ Recording Failed\n${errorMsg}`,
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
    }
  };

  const handleAddStock = async () => {
    if (!restockForm.quantityToAdd || !selectedStock) {
      toast.warning('⚠️ Please enter the quantity to add', {
        position: 'top-right',
        autoClose: 2500,
      });
      return;
    }

    const quantity = parseFloat(restockForm.quantityToAdd);
    const newTotal = selectedStock.currentQuantity + quantity;

    const toastId = toast.loading('⏳ Processing restock...', {
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
        notificationMsg = `\n🔔 ${response.data.alertsResolved} alert${response.data.alertsResolved > 1 ? 's' : ''} resolved - stock is healthy again!`;
      }

      const statusMsg = newTotal > selectedStock.reorderLevel * 2 
        ? '✅ Stock is now healthy'
        : newTotal > selectedStock.reorderLevel
        ? '⚠️ Stock is adequate but monitor usage'
        : '⚠️ Stock is still below optimal level';

      toast.update(toastId, {
        render: `✅ Restock Completed\n📦 Added: ${quantity} ${selectedStock.unit}\n📈 Total: ${newTotal.toFixed(2)} ${selectedStock.unit}\n${statusMsg}${notificationMsg}`,
        type: 'success',
        isLoading: false,
        autoClose: 4000,
      });

      setRestockForm({ quantityToAdd: '', notes: '' });
      setShowAddStockModal(false);
      setSelectedStock(null);
      await fetchAllData();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Unable to add stock';
      toast.update(toastId, {
        render: `❌ Restock Failed\n${errorMsg}`,
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
                  Stock Management
                </h1>
                <p className="text-gray-600 mt-2">Track and manage your inventory efficiently</p>
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
                Add Stock
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
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {selectedTab === 'overview' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
                  <p className="text-gray-500 text-sm mb-2">Total Items</p>
                  <p className="text-3xl font-bold text-gray-800">{analytics?.totalItems || 0}</p>
                </div>

                <div className="bg-white rounded-lg p-4 border-l-4 border-red-500 shadow-sm">
                  <p className="text-gray-500 text-sm mb-2">Low Stock</p>
                  <p className="text-3xl font-bold text-red-600">
                    {analytics?.lowStockItems?.length || 0}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500 shadow-sm">
                  <p className="text-gray-500 text-sm mb-2">Medium Stock</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {analytics?.mediumStockItems?.length || 0}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm">
                  <p className="text-gray-500 text-sm mb-2">Today's Usage</p>
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
                            <h3 className="font-bold text-lg">{item.itemName}</h3>
                            <p className="text-sm opacity-75">
                              {item.currentQuantity} {item.unit} • Status: {item.status}
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
                              <span className="text-sm font-medium">Stock Level</span>
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
                              <p className="text-xs text-gray-600 mb-1">Reorder Level</p>
                              <p className="font-semibold text-gray-800">
                                {item.reorderLevel} {item.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Daily Avg</p>
                              <p className="font-semibold text-gray-800">
                                {item.averageDailyConsumption?.toFixed(2) || 0} {item.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Last Restock</p>
                              <p className="font-semibold text-gray-800 text-sm">
                                {new Date(item.lastRestockDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Est. Depletion</p>
                              <p className="font-semibold text-gray-800 text-sm">
                                {item.estimatedDepletionDate
                                  ? new Date(item.estimatedDepletionDate).toLocaleDateString()
                                  : 'N/A'}
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
                              Record Usage
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
                              Restock
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No stock items found</p>
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
                    <h3 className="font-bold text-lg text-purple-900">Today's Total Usage</h3>
                    <TrendingDown className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-4xl font-bold text-purple-700 mb-2">
                    {analytics?.totalConsumptionToday?.toFixed(1) || 0}
                  </p>
                  <p className="text-sm text-purple-600">Combined across all items</p>
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <p className="text-xs text-purple-600">
                      📊 Track your daily consumption patterns to optimize stock levels
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 shadow-md border border-red-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-red-900">Critical Items</h3>
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="text-4xl font-bold text-red-700 mb-2">
                    {analytics?.lowStockItems?.length || 0}
                  </p>
                  <p className="text-sm text-red-600">Items below reorder level</p>
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <p className="text-xs text-red-600">
                      ⚠️ Immediate action needed - restock these items
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-md border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-green-900">Healthy Items</h3>
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-4xl font-bold text-green-700 mb-2">
                    {analytics?.highStockItems?.length || 0}
                  </p>
                  <p className="text-sm text-green-600">Items in optimal condition</p>
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-xs text-green-600">
                      ✅ Stock levels are adequate and well-managed
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                  <h3 className="font-bold text-lg mb-6 flex items-center">
                    <BarChart3 className="h-6 w-6 mr-3 text-blue-600" />
                    Daily Consumption Breakdown
                  </h3>
                  <div className="space-y-4">
                    {stockItems.length > 0 ? (
                      stockItems.map((item) => {
                        const avgDaily = item.averageDailyConsumption || 0;
                        const maxConsumption = Math.max(...stockItems.map(i => i.averageDailyConsumption || 0), 1);
                        return (
                          <div key={item._id} className="group">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-800">{item.itemName}</span>
                              <div className="text-right">
                                <span className="text-sm font-bold text-blue-600">{avgDaily.toFixed(2)}</span>
                                <span className="text-xs text-gray-500 ml-1">{item.unit}/day</span>
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
                              At current usage: {item.currentQuantity > 0 ? (item.currentQuantity / avgDaily).toFixed(1) : '∞'} days supply remaining
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-sm">No consumption data available</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                  <h3 className="font-bold text-lg mb-6 flex items-center">
                    <BarChart3 className="h-6 w-6 mr-3 text-green-600" />
                    Stock Health Overview
                  </h3>
                  <div className="space-y-5">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-semibold text-gray-800">Healthy Stock</span>
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
                      <p className="text-xs text-green-600 mt-2">✅ Items in optimal condition</p>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="font-semibold text-gray-800">Monitor Closely</span>
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
                      <p className="text-xs text-yellow-600 mt-2">⚠️ Restock soon to maintain supply</p>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="font-semibold text-gray-800">Critical Level</span>
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
                      <p className="text-xs text-red-600 mt-2">🚨 Immediate action required</p>
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
                          <p className="text-sm text-red-600">Critical Alerts</p>
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
                          <p className="text-sm text-yellow-600">Warnings</p>
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
                          <p className="text-sm text-blue-600">Active Alerts</p>
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
                          <p className="text-sm text-green-600">Resolved</p>
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
                          Active Alerts
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
                                      <p className="font-bold text-gray-900 text-lg">{alert.itemName}</p>
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        alert.severity === 'critical'
                                          ? 'bg-red-200 text-red-800'
                                          : 'bg-yellow-200 text-yellow-800'
                                      }`}>
                                        {alert.severity === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'}
                                      </span>
                                    </div>
                                    
                                    <p className={`mt-2 font-medium ${
                                      alert.severity === 'critical'
                                        ? 'text-red-800'
                                        : 'text-yellow-800'
                                    }`}>
                                      {alert.message}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                                      <div className="bg-white bg-opacity-60 rounded p-2">
                                        <p className="text-xs text-gray-600">Current Level</p>
                                        <p className="font-bold text-gray-900">{alert.currentQuantity} {alert.itemName === 'Detergent' || alert.itemName === 'Fabric Softener' || alert.itemName === 'Bleach' ? 'L' : 'Kg'}</p>
                                      </div>
                                      <div className="bg-white bg-opacity-60 rounded p-2">
                                        <p className="text-xs text-gray-600">Reorder Level</p>
                                        <p className="font-bold text-gray-900">{alert.reorderLevel} {alert.itemName === 'Detergent' || alert.itemName === 'Fabric Softener' || alert.itemName === 'Bleach' ? 'L' : 'Kg'}</p>
                                      </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                                      <Clock className="h-3 w-3" />
                                      <span>Alert Generated: {new Date(alert.date).toLocaleString()}</span>
                                    </div>

                                    {alert.severity === 'critical' && (
                                      <div className="mt-3 bg-red-100 border border-red-300 rounded px-3 py-2">
                                        <p className="text-sm font-semibold text-red-800">
                                          ⚠️ Action Required: Please restock this item immediately to avoid interruption
                                        </p>
                                      </div>
                                    )}
                                    {alert.severity === 'warning' && (
                                      <div className="mt-3 bg-yellow-100 border border-yellow-300 rounded px-3 py-2">
                                        <p className="text-sm font-semibold text-yellow-800">
                                          ⚠️ Monitor Closely: Stock is getting low - plan for restocking soon
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
                          Resolved Alerts
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
                                      <p className="font-bold text-gray-900 text-lg line-through text-gray-600">{alert.itemName}</p>
                                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-200 text-green-800">
                                        ✅ RESOLVED
                                      </span>
                                    </div>
                                    
                                    <p className="mt-2 font-medium text-gray-700 line-through">
                                      {alert.message}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                                      <div className="bg-white bg-opacity-60 rounded p-2">
                                        <p className="text-xs text-gray-600">Final Level</p>
                                        <p className="font-bold text-gray-900">{alert.currentQuantity} {alert.itemName === 'Detergent' || alert.itemName === 'Fabric Softener' || alert.itemName === 'Bleach' ? 'L' : 'Kg'}</p>
                                      </div>
                                      <div className="bg-white bg-opacity-60 rounded p-2">
                                        <p className="text-xs text-gray-600">Reorder Level</p>
                                        <p className="font-bold text-gray-900">{alert.reorderLevel} {alert.itemName === 'Detergent' || alert.itemName === 'Fabric Softener' || alert.itemName === 'Bleach' ? 'L' : 'Kg'}</p>
                                      </div>
                                    </div>

                                    <div className="mt-3 flex flex-col gap-1 text-xs text-gray-600">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        <span>Alert Generated: {new Date(alert.date).toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-3 w-3" />
                                        <span>Resolved: {new Date(alert.resolvedAt).toLocaleString()}</span>
                                      </div>
                                    </div>

                                    <div className="mt-3 bg-green-100 border border-green-300 rounded px-3 py-2">
                                      <p className="text-sm font-semibold text-green-800">
                                        ✅ Stock replenished - alert no longer active
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
                  <p className="text-xl font-bold text-green-900 mb-2">All Clear! ✅</p>
                  <p className="text-green-700 mb-1">No active alerts at the moment</p>
                  <p className="text-sm text-green-600">All stock levels are healthy and well-managed. Keep up the good work!</p>
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
                      {item.itemName} - Consumption History
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
                                    {entry.reason}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(entry.date).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-gray-800">
                                -{entry.quantityUsed} {item.unit}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No consumption history</p>
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
              <h2 className="text-xl font-bold text-gray-800">Add Stock</h2>
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
                  <p className="text-sm font-medium text-gray-600 mb-2">Item</p>
                  <p className="text-lg font-bold text-gray-800">{selectedStock.itemName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Quantity to Add ({selectedStock.unit})
                  </label>
                  <input
                    type="number"
                    placeholder="Enter quantity"
                    value={restockForm.quantityToAdd}
                    onChange={(e) =>
                      setRestockForm({ ...restockForm, quantityToAdd: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    placeholder="Add notes..."
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
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStock}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Stock
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
                    <p className="font-medium text-gray-800">{item.itemName}</p>
                    <p className="text-sm text-gray-600">
                      Current: {item.currentQuantity} {item.unit}
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
              <h2 className="text-xl font-bold text-gray-800">Record Consumption</h2>
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
                <p className="text-sm font-medium text-gray-600 mb-2">Item</p>
                <p className="text-lg font-bold text-gray-800">{selectedStock?.itemName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Available: {selectedStock?.currentQuantity} {selectedStock?.unit}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Quantity Used ({selectedStock?.unit})
                </label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  value={consumptionForm.quantityUsed}
                  onChange={(e) =>
                    setConsumptionForm({ ...consumptionForm, quantityUsed: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Reason</label>
                <select
                  value={consumptionForm.reason}
                  onChange={(e) =>
                    setConsumptionForm({ ...consumptionForm, reason: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Daily Consumption</option>
                  <option>Spillage</option>
                  <option>Waste</option>
                  <option>Other</option>
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
                  Cancel
                </button>
                <button
                  onClick={handleRecordConsumption}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer
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
