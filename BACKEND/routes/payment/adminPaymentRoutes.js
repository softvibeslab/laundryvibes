const express = require('express');
const { updateConfig } = require('../../controllers/payment/paymentConfigController');
const { authenticateUser, requireRoles } = require('../../middleware/authMiddleware');

const router = express.Router();
router.put('/payment-config', authenticateUser, requireRoles('admin'), updateConfig);
module.exports = router;
