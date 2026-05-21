const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', protect, authController.profile);
router.get('/users', authController.getAllUsers); // For notification service lookup

module.exports = router;
