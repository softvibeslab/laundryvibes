const Stock = require('../../models/Stock');
const { Types } = require('mongoose');
const { parseStockQuantity } = require('../../utils/stockValidation');
const { auditHttp } = require('../../services/auditService');
const { runInTransaction } = require('../../services/transactionService');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stockIdentityFilter = (itemName) => {
  const itemKey = Stock.normalizeStockIdentity(itemName);
  const flexibleName = itemKey.split(' ').map(escapeRegex).join('\\s+');
  return { $or: [{ itemKey }, { itemName: new RegExp(`^\\s*${flexibleName}\\s*$`, 'i') }] };
};
const atomic = (req, work) => runInTransaction(work, {
  transactionRunner: req.app?.locals?.config?.transactionRunner,
});

const statusExpression = () => ({
  $switch: {
    branches: [
      { case: { $lte: ['$currentQuantity', '$reorderLevel'] }, then: 'Low' },
      { case: { $lte: ['$currentQuantity', { $multiply: ['$reorderLevel', 2] }] }, then: 'Medium' },
    ],
    default: 'High',
  },
});

const getAllStock = async (req, res) => {
  try {
    const stockItems = await Stock.find().sort({ updatedAt: -1 });
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

const createStockItem = async (req, res, next) => {
  try {
    const { itemName, unit, notes } = req.body;
    const currentQuantity = parseStockQuantity(req.body.currentQuantity, { allowZero: true });
    const reorderLevel = req.body.reorderLevel === undefined ? 10 : parseStockQuantity(req.body.reorderLevel, { allowZero: true });
    if (!itemName || currentQuantity === null || reorderLevel === null) {
      return res.status(400).json({ message: 'El nombre y cantidades finitas (máximo 3 decimales) son obligatorios' });
    }
    const itemKey = Stock.normalizeStockIdentity(itemName);
    if (await Stock.exists(stockIdentityFilter(itemName))) return res.status(409).json({ message: 'El artículo del inventario ya existe' });
    const newStock = await atomic(req, async (session) => {
      const result = await Stock.create([{ itemName, itemKey, currentQuantity, unit: unit || 'Liters', reorderLevel, notes }], { session });
      const created = Array.isArray(result) ? result[0] : result;
      await auditHttp(req, 'inventory.item_created', { type: 'stock', id: String(created._id) }, { itemKey, currentQuantity }, { session });
      return created;
    });
    return res.status(201).json({ message: 'Artículo del inventario creado correctamente', data: newStock });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'El artículo del inventario ya existe' });
    return next(error);
  }
};


const addStock = async (req, res, next) => {
  try {
    const quantityToAdd = parseStockQuantity(req.body.quantityToAdd);
    if (quantityToAdd === null) return res.status(400).json({ message: 'La cantidad que se añadirá debe ser finita, mayor que 0 y tener máximo 3 decimales' });
    const now = new Date();
    const set = { lastRestockDate: now, lastRestockQuantity: quantityToAdd };
    if (req.body.notes !== undefined) set.notes = { $literal: String(req.body.notes) };
    const stockItem = await atomic(req, async (session) => {
      const updated = await Stock.findOneAndUpdate(
      { _id: req.params.id, currentQuantity: { $lte: 1_000_000 - quantityToAdd } },
      [
        { $set: { ...set, currentQuantity: { $add: ['$currentQuantity', quantityToAdd] } } },
        { $set: {
          status: statusExpression(),
          alerts: {
            $map: {
              input: { $ifNull: ['$alerts', []] }, as: 'alert',
              in: {
                $cond: [
                  { $and: [
                    { $eq: ['$$alert.isResolved', false] },
                    { $or: [
                      { $and: [{ $eq: ['$$alert.severity', 'critical'] }, { $gt: ['$currentQuantity', '$reorderLevel'] }] },
                      { $and: [{ $eq: ['$$alert.severity', 'warning'] }, { $gte: ['$currentQuantity', { $multiply: ['$reorderLevel', 2] }] }] },
                    ] },
                  ] },
                  { $mergeObjects: ['$$alert', { isResolved: true, resolvedAt: now }] },
                  '$$alert',
                ],
              },
            },
          },
        } },
      ],
        { new: true, session },
      );
      if (updated) await auditHttp(req, 'inventory.restocked', { type: 'stock', id: String(updated._id) }, { quantity: quantityToAdd }, { session });
      return updated;
    });
    if (!stockItem) {
      const exists = await Stock.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({ message: exists ? 'La reposición excede el límite operativo' : 'Artículo del inventario no encontrado' });
    }
    const alertsResolved = (stockItem.alerts || []).filter((alert) => (
      alert.isResolved && alert.resolvedAt && new Date(alert.resolvedAt).getTime() === now.getTime()
    )).length;
    return res.status(200).json({ message: 'Existencias añadidas correctamente', data: stockItem, alertsResolved });
  } catch (error) { return next(error); }
};

const recordConsumption = async (req, res, next) => {
  try {
    const quantityUsed = parseStockQuantity(req.body.quantityUsed);
    if (quantityUsed === null) return res.status(400).json({ message: 'La cantidad utilizada debe ser finita, mayor que 0 y tener máximo 3 decimales' });
    const now = new Date();
    const historyEntry = { _id: new Types.ObjectId(), date: now, quantityUsed, reason: String(req.body.reason || 'Daily Consumption') };
    const criticalAlertId = new Types.ObjectId();
    const warningAlertId = new Types.ObjectId();
    const stockItem = await atomic(req, async (session) => {
      const updated = await Stock.findOneAndUpdate(
      { _id: req.params.id, currentQuantity: { $gte: quantityUsed } },
      [
        { $set: {
          currentQuantity: { $subtract: ['$currentQuantity', quantityUsed] },
          consumptionHistory: { $concatArrays: [{ $ifNull: ['$consumptionHistory', []] }, [{ $literal: historyEntry }]] },
        } },
        { $set: {
          status: statusExpression(),
          averageDailyConsumption: {
            $divide: [
              { $reduce: { input: '$consumptionHistory', initialValue: 0, in: { $add: ['$$value', '$$this.quantityUsed'] } } },
              { $max: [1, { $ceil: { $divide: [{ $subtract: [now, { $arrayElemAt: ['$consumptionHistory.date', 0] }] }, 86_400_000] } }] },
            ],
          },
          alerts: {
            $let: {
              vars: { active: { $filter: { input: { $ifNull: ['$alerts', []] }, as: 'a', cond: { $eq: ['$$a.isResolved', false] } } } },
              in: {
                $concatArrays: [
                  { $ifNull: ['$alerts', []] },
                  { $cond: [
                    { $and: [
                      { $lte: ['$currentQuantity', '$reorderLevel'] },
                      { $eq: [{ $size: { $filter: { input: '$$active', as: 'a', cond: { $eq: ['$$a.severity', 'critical'] } } } }, 0] },
                    ] },
                    [{ _id: criticalAlertId, date: now, message: { $concat: ['Stock for ', '$itemName', ' has fallen below reorder level'] }, severity: 'critical', isResolved: false, resolvedAt: null }],
                    { $cond: [
                      { $and: [
                        { $gt: ['$currentQuantity', '$reorderLevel'] },
                        { $lte: ['$currentQuantity', { $multiply: ['$reorderLevel', 1.5] }] },
                        { $eq: [{ $size: '$$active' }, 0] },
                      ] },
                      [{ _id: warningAlertId, date: now, message: { $concat: ['Stock for ', '$itemName', ' is getting low - monitor usage closely'] }, severity: 'warning', isResolved: false, resolvedAt: null }],
                      [],
                    ] },
                  ] },
                ],
              },
            },
          },
        } },
        { $set: {
          estimatedDepletionDate: {
            $cond: [
              { $gt: ['$averageDailyConsumption', 0] },
              { $add: [now, { $multiply: [{ $divide: ['$currentQuantity', '$averageDailyConsumption'] }, 86_400_000] }] },
              '$estimatedDepletionDate',
            ],
          },
        } },
      ],
        { new: true, session },
      );
      if (updated) await auditHttp(req, 'inventory.consumed', { type: 'stock', id: String(updated._id) }, { quantity: quantityUsed }, { session });
      return updated;
    });
    if (!stockItem) {
      const existing = await Stock.findById(req.params.id).select('currentQuantity');
      if (!existing) return res.status(404).json({ message: 'Artículo del inventario no encontrado' });
      return res.status(409).json({
        message: 'No hay existencias suficientes. No se puede registrar el consumo.',
        available: existing.currentQuantity,
        requested: quantityUsed,
      });
    }
    const alertTriggered = (stockItem.alerts || []).some((alert) => (
      !alert.isResolved && alert.date && new Date(alert.date).getTime() === now.getTime()
    ));
    return res.status(200).json({ message: 'Consumo registrado correctamente', data: stockItem, alertTriggered });
  } catch (error) { return next(error); }
};

const updateStockItem = async (req, res, next) => {
  try {
    const allowed = ['reorderLevel', 'notes'];
    const keys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
    if (keys.length === 0 || keys.some((key) => !allowed.includes(key))) {
      return res.status(400).json({ message: 'La actualización debe contener sólo reorderLevel o notes' });
    }
    const update = {};
    if (req.body.reorderLevel !== undefined) {
      const reorderLevel = parseStockQuantity(req.body.reorderLevel, { allowZero: true });
      if (reorderLevel === null) return res.status(400).json({ message: 'El nivel debe ser finito, no negativo y tener máximo 3 decimales' });
      update.reorderLevel = reorderLevel;
    }
    if (req.body.notes !== undefined) update.notes = { $literal: String(req.body.notes) };
    const stockItem = await atomic(req, async (session) => {
      const updated = await Stock.findOneAndUpdate(
        { _id: req.params.id },
        [{ $set: update }, { $set: { status: statusExpression() } }],
        { new: true, session },
      );
      if (updated) await auditHttp(req, 'inventory.item_updated', { type: 'stock', id: String(updated._id) }, { reorderLevel: update.reorderLevel }, { session });
      return updated;
    });
    if (!stockItem) return res.status(404).json({ message: 'Artículo del inventario no encontrado' });
    return res.status(200).json({ message: 'Artículo del inventario actualizado correctamente', data: stockItem });
  } catch (error) { return next(error); }
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

const deleteStockItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stockItem = await atomic(req, async (session) => {
      const deleted = await Stock.findByIdAndDelete(id, { session });
      if (deleted) await auditHttp(req, 'inventory.item_deleted', { type: 'stock', id: String(deleted._id) }, {
        itemKey: deleted.itemKey,
      }, { session });
      return deleted;
    });
    if (!stockItem) {
      return res.status(404).json({ message: 'Artículo del inventario no encontrado' });
    }
    return res.status(200).json({
      message: 'Artículo del inventario eliminado correctamente',
      data: stockItem,
    });
  } catch (error) { return next(error); }
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
