
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredNotifications, markNotificationAsRead, clearNotifications } from '@/lib/NotificationManager';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = () => {
    const notifs = getStoredNotifications();
    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.read).length);
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => loadNotifications();
    const handleNew = (e) => {
      setNotifications(prev => [e.detail, ...prev].slice(0, 50));
      setUnreadCount(c => c + 1);
    };

    window.addEventListener('passmark_notifications_updated', handleUpdate);
    window.addEventListener('passmark_new_notification', handleNew);

    return () => {
      window.removeEventListener('passmark_notifications_updated', handleUpdate);
      window.removeEventListener('passmark_new_notification', handleNew);
    };
  }, []);

  const handleMarkAsRead = (id) => {
    markNotificationAsRead(id);
  };

  const handleClearAll = () => {
    clearNotifications();
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead: handleMarkAsRead, 
      clearAll: handleClearAll 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
