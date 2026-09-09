import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredNotifications, markNotificationAsRead, clearNotifications } from '@/lib/NotificationManager';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

const NotificationContext = createContext(null);

// Server-backed notifications (public.notifications, e.g. admin broadcasts —
// see supabase/migrations/20260910170000_021_admin_broadcast_notifications.sql)
// are merged into the same list as the pre-existing localStorage ones
// (streak reminders, exam countdowns, ...) by design — the two systems
// coexist rather than one replacing the other (product decision 2026-09-10).
// A server row's id is a uuid; a local row's id is a numeric-string
// timestamp (see NotificationManager.addNotification) — that's what
// markAsRead/clearAll below use to route to the right storage.

const isServerId = (id) => typeof id === 'string' && id.includes('-');

const fromServerRow = (row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  timestamp: row.created_at,
  read: Boolean(row.read_at),
  type: row.source === 'admin_broadcast' ? 'ADMIN_BROADCAST' : 'SERVER',
  action: row.action || null,
  links: Array.isArray(row.links) ? row.links : [],
});

export const NotificationProvider = ({ children }) => {
  const { user } = useUser();
  const [localNotifications, setLocalNotifications] = useState([]);
  const [serverNotifications, setServerNotifications] = useState([]);

  const loadLocal = () => setLocalNotifications(getStoredNotifications());

  const loadServer = useCallback(async () => {
    if (!user?.id) { setServerNotifications([]); return; }
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, links, source, action, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setServerNotifications((data || []).map(fromServerRow));
  }, [user?.id]);

  useEffect(() => {
    loadLocal();
    const handleUpdate = () => loadLocal();
    const handleNew = (e) => setLocalNotifications((prev) => [e.detail, ...prev].slice(0, 50));
    window.addEventListener('passmark_notifications_updated', handleUpdate);
    window.addEventListener('passmark_new_notification', handleNew);
    return () => {
      window.removeEventListener('passmark_notifications_updated', handleUpdate);
      window.removeEventListener('passmark_new_notification', handleNew);
    };
  }, []);

  useEffect(() => {
    loadServer();
    // No Realtime subscription (keeps this cheap) — a light poll plus a
    // refresh on tab focus is enough for "did an admin broadcast land".
    const interval = setInterval(loadServer, 60000);
    const onFocus = () => loadServer();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [loadServer]);

  const notifications = [...serverNotifications, ...localNotifications]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id) => {
    if (isServerId(id)) {
      setServerNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    } else {
      markNotificationAsRead(id);
    }
  };

  const handleClearAll = async () => {
    clearNotifications();
    setServerNotifications([]);
    if (user?.id) await supabase.from('notifications').delete().eq('user_id', user.id);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead: handleMarkAsRead,
      clearAll: handleClearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
