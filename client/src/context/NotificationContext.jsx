import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/api/notifications/${user.id || user._id}`);
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Handle in-app real-time notification alerts via websocket
  useEffect(() => {
    if (!socket || !user) return;

    // We can listen to a global event or trigger fetch on receipt of chat notifications
    const handleIncomingMessage = (msg) => {
      // If user is not the sender, refresh notifications to pull the new alert
      if (msg.senderId !== (user.id || user._id)) {
        fetchNotifications();
      }
    };

    socket.on('receiveMessage', handleIncomingMessage);

    return () => {
      socket.off('receiveMessage', handleIncomingMessage);
    };
  }, [socket, user]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/read/${id}`);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const clearAllNotifications = async () => {
    // Helper to mark all as read locally for convenience
    for (const n of notifications.filter(x => !x.read)) {
      await markAsRead(n._id);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAsRead, clearAllNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
