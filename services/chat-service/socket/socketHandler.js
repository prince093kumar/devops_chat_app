const Message = require('../models/Message');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

module.exports = (io, redisClient, redisPub) => {
  // 1. Socket.IO Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication error. Token required.'));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error. Invalid or expired token.'));
      }
      socket.user = decoded;
      next();
    });
  });

  // 2. Main Connection Event
  io.on('connection', async (socket) => {
    const username = socket.user.username;
    const userId = socket.user.id;

    console.log(`🔌 Socket connected: ${username} (${socket.id})`);

    // Add user to Redis online users set
    if (redisClient) {
      try {
        await redisClient.sadd('online_users', username);
        const onlineUsers = await redisClient.smembers('online_users');
        io.emit('onlineUsersList', onlineUsers);
      } catch (err) {
        console.error('Redis error adding online user:', err);
      }
    }

    // Acknowledge connection
    socket.emit('connected', { userId, username });

    // Join Room
    socket.on('joinRoom', async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) return;

        // Verify authorization if it is a private room
        if (room.adminId && room.adminId !== userId && !room.authorizedUsers.includes(userId)) {
          console.warn(`⚠️ User ${username} unauthorized attempt to join room: ${roomId}`);
          socket.emit('error', { message: 'You are not authorized to access this channel.' });
          return;
        }

        socket.join(roomId);
        console.log(`👥 User ${username} joined room: ${roomId}`);
      } catch (err) {
        console.error('Error joining room socket:', err);
      }
    });

    // Send Message
    socket.on('sendMessage', async ({ roomId, message }) => {
      if (!roomId || !message) return;

      try {
        // Fetch room info to get the name for user notifications
        const room = await Room.findById(roomId);
        if (!room) return;

        // Verify authorization if it is a private room
        if (room.adminId && room.adminId !== userId && !room.authorizedUsers.includes(userId)) {
          socket.emit('error', { message: 'You are not authorized to send messages in this channel.' });
          return;
        }

        const roomName = room.name;

        // Persist message to database
        const savedMessage = await Message.create({
          senderId: userId,
          senderUsername: username,
          roomId,
          message
        });

        // Broadcast message to everyone in the room (including sender)
        io.to(roomId).emit('receiveMessage', savedMessage);

        // Publish notification event to Redis for the Notification Service
        if (redisPub) {
          const notificationEvent = {
            senderId: userId,
            senderUsername: username,
            roomId,
            roomName,
            authorizedUsers: room.adminId ? [...room.authorizedUsers] : null,
            message: message.substring(0, 100), // Limit length
            timestamp: savedMessage.timestamp
          };
          
          await redisPub.publish('chat:notifications', JSON.stringify(notificationEvent));
        }
      } catch (err) {
        console.error('Error handling sendMessage:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing Indicator
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('typing', {
        username,
        isTyping
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${username} (${socket.id})`);
      
      if (redisClient) {
        try {
          // Remove user from online users set
          await redisClient.srem('online_users', username);
          const onlineUsers = await redisClient.smembers('online_users');
          io.emit('onlineUsersList', onlineUsers);
        } catch (err) {
          console.error('Redis error removing online user:', err);
        }
      }
    });
  });
};
