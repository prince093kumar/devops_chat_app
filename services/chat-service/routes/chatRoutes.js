const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const protect = require('../middleware/authMiddleware');

// Room endpoints
router.get('/rooms', protect, chatController.getRooms);
router.post('/rooms', protect, chatController.createRoom);
router.post('/rooms/:roomId/authorize', protect, chatController.authorizeUser);
router.get('/rooms/:roomId/members', protect, chatController.getRoomMembers);

// Message endpoints
router.get('/messages/:roomId', protect, chatController.getMessages);
router.post('/messages', protect, chatController.sendMessage);

module.exports = router;
