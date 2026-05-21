const Message = require('../models/Message');
const Room = require('../models/Room');

// @desc    Get messages for a room
// @route   GET /api/messages/:roomId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Fetch room to check authorization
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.adminId && room.adminId !== userId && !room.authorizedUsers.includes(userId)) {
      return res.status(403).json({ message: 'You are not authorized to access this channel' });
    }

    const messages = await Message.find({ roomId })
      .sort({ timestamp: 1 })
      .limit(100); // limit to last 100 messages for speed

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server Error fetching messages' });
  }
};

// @desc    Send a message (REST fallback)
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { roomId, message } = req.body;
    const userId = req.user.id;
    const username = req.user.username || 'Anonymous';

    if (!roomId || !message) {
      return res.status(400).json({ message: 'Please provide roomId and message' });
    }

    // Fetch room to check authorization
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.adminId && room.adminId !== userId && !room.authorizedUsers.includes(userId)) {
      return res.status(403).json({ message: 'You are not authorized to send messages in this channel' });
    }

    const newMessage = await Message.create({
      senderId: userId,
      senderUsername: username,
      roomId,
      message
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server Error sending message' });
  }
};

// @desc    Get all chat rooms
// @route   GET /api/rooms
// @access  Private
exports.getRooms = async (req, res) => {
  try {
    const userId = req.user.id;
    // Find rooms where:
    // - adminId is empty/null/undefined (public rooms)
    // - OR adminId is equal to current user
    // - OR user is in the authorizedUsers list
    const rooms = await Room.find({
      $or: [
        { adminId: { $in: ['', null] } },
        { adminId: userId },
        { authorizedUsers: userId }
      ]
    }).sort({ name: 1 });

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Server Error fetching rooms' });
  }
};

// @desc    Create a new chat room
// @route   POST /api/rooms
// @access  Private (Can be User or Admin)
exports.createRoom = async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    // Check if room name exists
    const roomExists = await Room.findOne({ name: name.trim() });
    if (roomExists) {
      return res.status(400).json({ message: 'Room already exists' });
    }

    const roomData = {
      name: name.trim(),
      description: description || ''
    };

    if (isPrivate) {
      roomData.adminId = userId;
      roomData.authorizedUsers = [userId];
    }

    const newRoom = await Room.create(roomData);
    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Server Error creating room' });
  }
};

// @desc    Authorize a user for a private chat room
// @route   POST /api/rooms/:roomId/authorize
// @access  Private (Admin of the room only)
exports.authorizeUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username } = req.body;
    const requesterId = req.user.id;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Only the admin of the room can authorize others
    if (room.adminId !== requesterId) {
      return res.status(403).json({ message: 'Only the room admin can manage access' });
    }

    // Query auth-service to find user by username
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:5001';
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/users`);
    if (!response.ok) {
      return res.status(500).json({ message: 'Failed to query Auth Service' });
    }
    const users = await response.json();
    const targetUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found in system' });
    }

    const targetUserId = targetUser._id.toString();

    // Check if already authorized
    if (room.authorizedUsers.includes(targetUserId)) {
      return res.status(400).json({ message: 'User is already authorized for this room' });
    }

    room.authorizedUsers.push(targetUserId);
    await room.save();

    res.json({ message: `Successfully authorized user ${targetUser.username} for this channel` });
  } catch (error) {
    console.error('Error authorizing user:', error);
    res.status(500).json({ message: 'Server Error authorizing user' });
  }
};

// @desc    Get room members list (Admin and Authorized users)
// @route   GET /api/rooms/:roomId/members
// @access  Private
exports.getRoomMembers = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Fetch all users from auth-service
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:5001';
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/users`);
    if (!response.ok) {
      return res.status(500).json({ message: 'Failed to query Auth Service' });
    }
    const users = await response.json();

    // Map user IDs to usernames
    const adminUser = users.find(u => u._id.toString() === room.adminId);
    const authorizedUsers = users.filter(u => room.authorizedUsers.includes(u._id.toString()));

    res.json({
      admin: adminUser ? { id: adminUser._id, username: adminUser.username } : null,
      authorized: authorizedUsers.map(u => ({ id: u._id, username: u.username }))
    });
  } catch (error) {
    console.error('Error fetching room members:', error);
    res.status(500).json({ message: 'Server error fetching room members' });
  }
};
