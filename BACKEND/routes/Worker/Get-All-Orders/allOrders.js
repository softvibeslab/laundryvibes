const express = require('express');
const router = express.Router();
const { authenticateUser, requireRoles } = require('../../../middleware/authMiddleware');
const {
  assignOrder, getOrderDetail, getWorkerOrders, reopenOrder, retryCompletedNotification,
  transitionOrder, updateOrderStatus,
} = require('../../../controllers/worker/All-Orders/allorders');
const { recordPosPayment } = require('../../../controllers/payment/paymentController');
const { uploadEvidence } = require('../../../middleware/evidenceUpload');

router.use(authenticateUser, requireRoles('worker', 'admin'));

// Canonical phase-2 API. The same router may be mounted at /api/worker and /api/admin.
router.get('/orders', getWorkerOrders);
router.get('/orders/:orderId', getOrderDetail);
router.patch('/orders/:orderId/transition', transitionOrder);
router.patch('/orders/:orderId/assignment', assignOrder);
router.patch('/orders/:orderId/reopen', requireRoles('admin'), reopenOrder);
router.post('/orders/:orderId/notifications/completed/retry', retryCompletedNotification);
router.patch('/orders/:orderId/payment', uploadEvidence, recordPosPayment);

// Backward-compatible aliases.
router.get('/getallorderdetails', getWorkerOrders);
router.patch('/update-order-status/:orderId', updateOrderStatus);

module.exports = router;
