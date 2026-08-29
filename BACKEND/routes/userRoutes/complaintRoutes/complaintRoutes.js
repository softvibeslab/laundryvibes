const express = require('express');
const router = express.Router();
const { authenticateUser, requireRoles } = require('../../../middleware/authMiddleware');
const { submitComplaint } = require('../../../controllers/user/Complaint Form/complaintformController');

// Route for submitting a complaint
router.post('/submit-complaint', authenticateUser, requireRoles('user'), submitComplaint);

module.exports = router;
