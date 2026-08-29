const express = require('express')
const router = express.Router()
const authenticateUser = require("../../middleware/authMiddleware")
const {submitOrder,getOrderSummary} = require('../../controllers/user/OrderManagement/orderController')
const authMiddleware = require('../../middleware/authMiddleware');


router.post('/submit-order',authenticateUser, require('../../middleware/authMiddleware').requireRoles('user'), submitOrder);
router.get('/order-history',authMiddleware, require('../../middleware/authMiddleware').requireRoles('user'), getOrderSummary);

module.exports = router