const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const protect = require('../middleware/authMiddleware');

router.get('/:userId', protect, notificationController.getUserNotifications);
router.put('/read/:id', protect, notificationController.markAsRead);

module.exports = router;
