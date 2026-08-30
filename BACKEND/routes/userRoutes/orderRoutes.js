const express = require('express')
const router = express.Router()
const authenticateUser = require("../../middleware/authMiddleware")
const {submitOrder,getOrderSummary} = require('../../controllers/user/OrderManagement/orderController')
const { getOrderDetail, listOrders } = require('../../controllers/worker/All-Orders/allorders');
const authMiddleware = require('../../middleware/authMiddleware');
const { uploadEvidence } = require('../../middleware/evidenceUpload');


router.post('/submit-order',authenticateUser, require('../../middleware/authMiddleware').requireRoles('user'), uploadEvidence, submitOrder);
router.get('/order-history',authMiddleware, require('../../middleware/authMiddleware').requireRoles('user'), getOrderSummary);
router.get('/orders', authMiddleware, require('../../middleware/authMiddleware').requireRoles('user'), listOrders);
router.get('/orders/:orderId', authMiddleware, require('../../middleware/authMiddleware').requireRoles('user'), getOrderDetail);

module.exports = router