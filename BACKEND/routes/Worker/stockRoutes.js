const express = require('express');
const router = express.Router();
const { authenticateUser, requireRoles } = require('../../middleware/authMiddleware');
const {
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
} = require('../../controllers/worker/stockController');

router.use(authenticateUser, requireRoles('worker', 'admin'));

router.get('/all', getAllStock);

router.get('/analytics', getStockAnalytics);

router.get('/consumption-history', getConsumptionHistory);

router.get('/alerts', getAllAlerts);

router.get('/:id', getStockById);

router.post('/create', createStockItem);

router.post('/:id/add', addStock);

router.post('/:id/consume', recordConsumption);

router.put('/:id/update', updateStockItem);

router.delete('/:id/delete', deleteStockItem);

module.exports = router;
