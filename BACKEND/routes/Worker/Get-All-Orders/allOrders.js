const express = require("express");
const router = express.Router();
const { authenticateUser, requireRoles } = require('../../../middleware/authMiddleware');

const {getWorkerOrders,updateOrderStatus} = require("../../../controllers/worker/All-Orders/allorders")

router.use(authenticateUser, requireRoles('worker', 'admin'));
router.get("/getallorderdetails",getWorkerOrders)
router.patch("/update-order-status/:orderId",updateOrderStatus)

module.exports = router