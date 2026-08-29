const express = require("express");
const { createWorker } = require("../../../controllers/Admin/worker-Controller/workerController");
const {loginUser}=require('../../../controllers/user/Authentification/userController')
const router = express.Router();
const { authenticateUser, requireRoles } = require('../../../middleware/authMiddleware');

router.post("/add-worker", authenticateUser, requireRoles('admin'), createWorker); // Admin adds worker
router.post('/login', loginUser);

module.exports = router;