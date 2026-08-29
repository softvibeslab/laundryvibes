const express = require("express");
const router = express.Router();
const { authenticateUser, requireRoles } = require('../../../middleware/authMiddleware');

const {getWorkerOrders,updateOrderStatus} = require("../../../controllers/worker/All-Orders/allorders")
const { recordPosPayment } = require('../../../controllers/payment/paymentController');
const { uploadEvidence } = require('../../../middleware/evidenceUpload');

router.use(authenticateUser, requireRoles('worker', 'admin'));
router.get("/getallorderdetails",getWorkerOrders)
router.patch("/update-order-status/:orderId",updateOrderStatus)
router.patch('/orders/:orderId/payment', uploadEvidence, recordPosPayment);

module.exports = router