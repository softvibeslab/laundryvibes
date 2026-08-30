const express = require('express');
const { getConfig } = require('../../controllers/payment/paymentConfigController');
const { getEvidence } = require('../../controllers/payment/paymentController');
const { authenticateUser, requireRoles } = require('../../middleware/authMiddleware');

const router = express.Router();
router.use(authenticateUser, requireRoles('user', 'worker', 'admin'));
router.get('/config', getConfig);
router.get('/orders/:orderId/evidence', getEvidence);
module.exports = router;
