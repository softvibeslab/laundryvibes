const Stock = require('../../models/Stock');

const getAllStock = async (req, res) => {
  try {
    const stockItems = await Stock.find().sort({ updatedAt: -1 });
    
    if (!stockItems || stockItems.length === 0) {
      const defaultItems = [
        { itemName: 'Detergent', currentQuantity: 50, unit: 'Liters', reorderLevel: 10 },
        { itemName: 'Fabric Softener', currentQuantity: 30, unit: 'Liters', reorderLevel: 8 },
        { itemName: 'Soap', currentQuantity: 40, unit: 'Kg', reorderLevel: 10 },
        { itemName: 'Bleach', currentQuantity: 20, unit: 'Liters', reorderLevel: 5 },
        { itemName: 'Starch', currentQuantity: 25, unit: 'Kg', reorderLevel: 5 },
      ];

      const createdItems = await Stock.insertMany(defaultItems);
      return res.status(201).json({
        message: 'Artículos iniciales del inventario creados',
        data: createdItems,
      });
    }

    res.status(200).json({
      message: 'Artículos del inventario obtenidos correctamente',
      data: stockItems,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener los artículos del inventario',
    });
  }
};

const getStockById = async (req, res) => {
  try {
    const { id } = req.params;
    const stockItem = await Stock.findById(id);

    if (!stockItem) {
      return res.status(404).json({ message: 'Artículo del inventario no encontrado' });
    }

    res.status(200).json({
      message: 'Artículo del inventario obtenido correctamente',
      data: stockItem,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener el artículo del inventario',
    });
  }
};

const createStockItem = async (req, res) => {
  try {
    const { itemName, currentQuantity, unit, reorderLevel, notes } = req.body;

    if (!itemName || currentQuantity === undefined) {
      return res.status(400).json({
        message: 'El nombre del artículo y la cantidad actual son obligatorios',
      });
    }

    const existingItem = await Stock.findOne({ itemName });
    if (existingItem) {
      return res.status(400).json({
        message: 'El artículo del inventario ya existe',
      });
    }

    const newStock = new Stock({
      itemName,
      currentQuantity,
      unit: unit || 'Liters',
      reorderLevel: reorderLevel || 10,
      notes,
    });

    await newStock.save();

    res.status(201).json({
      message: 'Artículo del inventario creado correctamente',
      data: newStock,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al crear el artículo del inventario',
    });
  }
};


const addStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityToAdd, notes } = req.body;

    if (!quantityToAdd || quantityToAdd <= 0) {
      return res.status(400).json({
        message: 'La cantidad que se añadirá debe ser mayor que 0',
      });
    }

    const stockItem = await Stock.findById(id);
    if (!stockItem) {
      return res.status(404).json({ message: 'Artículo del inventario no encontrado' });
    }

    stockItem.currentQuantity += quantityToAdd;
    const currentLevel = stockItem.currentQuantity;
    const reorderLevel = stockItem.reorderLevel;

    stockItem.lastRestockDate = new Date();
    stockItem.lastRestockQuantity = quantityToAdd;
    if (notes) {
      stockItem.notes = notes;
    }

    
    let resolvedAlertCount = 0;
    const isSufficient = currentLevel >= (reorderLevel * 2);
    const isAboveReorder = currentLevel > reorderLevel;
    
    
    stockItem.alerts.forEach((alert) => {
      if (!alert.isResolved) {
        
        if (alert.severity === 'critical' && isAboveReorder) {
          alert.isResolved = true;
          alert.resolvedAt = new Date();
          resolvedAlertCount++;
        }
        else if (alert.severity === 'warning' && isSufficient) {
          alert.isResolved = true;
          alert.resolvedAt = new Date();
          resolvedAlertCount++;
        }
      }
    });

    await stockItem.save();

    res.status(200).json({
      message: 'Existencias añadidas correctamente',
      data: stockItem,
      alertsResolved: resolvedAlertCount,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al añadir existencias',
    });
  }
};

const recordConsumption = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityUsed, reason } = req.body;

    if (!quantityUsed || quantityUsed <= 0) {
      return res.status(400).json({
        message: 'La cantidad utilizada debe ser mayor que 0',
      });
    }

    const stockItem = await Stock.findById(id);
    if (!stockItem) {
      return res.status(404).json({ message: 'Artículo del inventario no encontrado' });
    }

    if (stockItem.currentQuantity < quantityUsed) {
      return res.status(400).json({
        message: 'No hay existencias suficientes. No se puede registrar el consumo.',
        available: stockItem.currentQuantity,
        requested: quantityUsed,
      });
    }

    const previousQuantity = stockItem.currentQuantity;
    stockItem.currentQuantity -= quantityUsed;
    const currentQuantity = stockItem.currentQuantity;
    const reorderLevel = stockItem.reorderLevel;
    const warningThreshold = reorderLevel * 1.5;

    stockItem.consumptionHistory.push({
      date: new Date(),
      quantityUsed,
      reason: reason || 'Daily Consumption',
    });

    let alertTriggered = false;
    
    if (currentQuantity <= reorderLevel) {
      const hasCriticalAlert = stockItem.alerts.some(a => a.severity === 'critical' && !a.isResolved);
      if (!hasCriticalAlert) {
        stockItem.alerts.push({
          date: new Date(),
          message: `Stock for ${stockItem.itemName} has fallen below reorder level`,
          severity: 'critical',
          isResolved: false,
        });
        alertTriggered = true;
      }
    }
    else if (currentQuantity <= warningThreshold && currentQuantity > reorderLevel) {
      const hasWarningOrCriticalAlert = stockItem.alerts.some(a => (a.severity === 'warning' || a.severity === 'critical') && !a.isResolved);
      if (!hasWarningOrCriticalAlert) {
        stockItem.alerts.push({
          date: new Date(),
          message: `Stock for ${stockItem.itemName} is getting low - monitor usage closely`,
          severity: 'warning',
          isResolved: false,
        });
        alertTriggered = true;
      }
    }

    await stockItem.save();

    res.status(200).json({
      message: 'Consumo registrado correctamente',
      data: stockItem,
      alertTriggered,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al registrar el consumo',
    });
  }
};

const updateStockItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { reorderLevel, notes } = req.body;

    const stockItem = await Stock.findById(id);
    if (!stockItem) {
      return res.status(404).json({ message: 'Artículo del inventario no encontrado' });
    }

    if (reorderLevel !== undefined) {
      stockItem.reorderLevel = reorderLevel;
    }
    if (notes !== undefined) {
      stockItem.notes = notes;
    }

    await stockItem.save();

    res.status(200).json({
      message: 'Artículo del inventario actualizado correctamente',
      data: stockItem,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al actualizar el artículo del inventario',
    });
  }
};

const getStockAnalytics = async (req, res) => {
  try {
    const stockItems = await Stock.find();

    const analytics = {
      totalItems: stockItems.length,
      lowStockItems: stockItems.filter((item) => item.status === 'Low'),
      mediumStockItems: stockItems.filter((item) => item.status === 'Medium'),
      highStockItems: stockItems.filter((item) => item.status === 'High'),
      totalConsumptionToday: 0,
      averageDailyConsumption: {},
      alertsCount: 0,
      criticalAlerts: [],
    };

    const today = new Date().toDateString();

    stockItems.forEach((item) => {
      const todayConsumption = item.consumptionHistory
        .filter((entry) => new Date(entry.date).toDateString() === today)
        .reduce((sum, entry) => sum + entry.quantityUsed, 0);

      analytics.totalConsumptionToday += todayConsumption;
      analytics.averageDailyConsumption[item.itemName] = item.averageDailyConsumption;

      analytics.alertsCount += item.alerts.length;
      analytics.criticalAlerts.push(
        ...item.alerts.filter((alert) => alert.severity === 'critical')
      );
    });

    res.status(200).json({
      message: 'Análisis del inventario obtenido correctamente',
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener el análisis del inventario',
    });
  }
};

const getConsumptionHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stockItems = await Stock.find();

    let history = [];

    stockItems.forEach((item) => {
      let itemConsumption = item.consumptionHistory;

      if (startDate || endDate) {
        itemConsumption = itemConsumption.filter((entry) => {
          const entryDate = new Date(entry.date);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && end) {
            return entryDate >= start && entryDate <= end;
          } else if (start) {
            return entryDate >= start;
          } else if (end) {
            return entryDate <= end;
          }
          return true;
        });
      }

      history.push({
        itemName: item.itemName,
        consumption: itemConsumption,
      });
    });

    res.status(200).json({
      message: 'Historial de consumo obtenido correctamente',
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener el historial de consumo',
    });
  }
};

const getAllAlerts = async (req, res) => {
  try {
    const stockItems = await Stock.find();
    const allAlerts = [];

    stockItems.forEach((item) => {
      item.alerts.forEach((alert) => {
        allAlerts.push({
          stockId: item._id,
          alertId: alert._id,
          itemName: item.itemName,
          currentQuantity: item.currentQuantity,
          reorderLevel: item.reorderLevel,
          ...alert._doc,
        });
      });
    });

    allAlerts.sort((a, b) => {
      if (a.isResolved !== b.isResolved) {
        return a.isResolved ? 1 : -1;
      }
      return new Date(b.date) - new Date(a.date);
    });

    res.status(200).json({
      message: 'Todas las alertas se obtuvieron correctamente',
      data: allAlerts,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener las alertas',
    });
  }
};

const deleteStockItem = async (req, res) => {
  try {
    const { id } = req.params;

    const stockItem = await Stock.findByIdAndDelete(id);
    if (!stockItem) {
      return res.status(404).json({ message: 'Artículo del inventario no encontrado' });
    }

    res.status(200).json({
      message: 'Artículo del inventario eliminado correctamente',
      data: stockItem,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al eliminar el artículo del inventario',
    });
  }
};

module.exports = {
  getAllStock,
  getStockById,
  createStockItem,
  addStock,
  recordConsumption,
  updateStockItem,
  getStockAnalytics,
  getConsumptionHistory,
  getAllAlerts,
  deleteStockItem,
};
