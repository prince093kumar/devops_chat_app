const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications/:userId
// @access  Private
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const authUserId = req.user.id;

    // Security: Check if authenticated user matches target userId
    if (authUserId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Cannot access other users\' notifications' });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50 notifications

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server Error fetching notifications' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/read/:id
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const authUserId = req.user.id;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Security: Ensure notification belongs to the authenticated user
    if (notification.userId !== authUserId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Cannot modify this notification' });
    }

    notification.read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Server Error updating notification' });
  }
};
