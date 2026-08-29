const express = require("express");
const authMiddleware =  require('../../../middleware/authMiddleware');
const {getUserProfile,updateUserProfile} = require('../../../controllers/user/Profile-Management/profileController')
const {updatePassword} = require('../../../controllers/user/Authentification/userController')
const router = express.Router();
const userOnly = require('../../../middleware/authMiddleware').requireRoles('user');

router.get('/profile',authMiddleware,userOnly,getUserProfile);
router.patch('/profile',authMiddleware,userOnly,updateUserProfile);
router.put('/update-password',authMiddleware,userOnly,updatePassword)

module.exports = router