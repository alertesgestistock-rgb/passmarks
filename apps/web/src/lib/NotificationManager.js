
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const getStoredNotifications = () => {
  try {
    const data = localStorage.getItem('passmark_notifications');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveNotifications = (notifications) => {
  localStorage.setItem('passmark_notifications', JSON.stringify(notifications));
};

export const addNotification = async (notification) => {
  const notifications = getStoredNotifications();
  const newNotif = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    read: false,
    ...notification
  };
  
  const updated = [newNotif, ...notifications].slice(0, 50); // Keep last 50
  saveNotifications(updated);

  // Dispatch custom event for context to pick up
  window.dispatchEvent(new CustomEvent('passmark_new_notification', { detail: newNotif }));

  // Try system notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(newNotif.title, {
      body: newNotif.body,
      icon: '/icon-192x192.png' // Assuming PWA icon exists
    });
  }

  return newNotif;
};

export const markNotificationAsRead = (id) => {
  const notifications = getStoredNotifications().map(n => 
    n.id === id ? { ...n, read: true } : n
  );
  saveNotifications(notifications);
  window.dispatchEvent(new Event('passmark_notifications_updated'));
};

export const clearNotifications = () => {
  saveNotifications([]);
  window.dispatchEvent(new Event('passmark_notifications_updated'));
};

export const scheduleNotifications = (user, streakData) => {
  // Simple check to avoid spamming. In a real app, this needs a more robust background worker/ServiceWorker.
  const lastScheduled = localStorage.getItem('passmark_last_scheduled');
  const today = new Date().setHours(0,0,0,0).toString();
  
  if (lastScheduled === today) return;

  const settings = JSON.parse(localStorage.getItem('passmark_settings') || '{}');
  
  // 1. STREAK REMINDER
  if (settings.streakReminder !== false && streakData?.current > 0) {
    // Schedule for later today if they haven't opened yet (simulated logic)
    setTimeout(() => {
      addNotification({
        type: 'STREAK_REMINDER',
        title: 'Keep your streak alive!',
        body: `Don't break your streak, ${user?.name || 'there'}! Quick 5-min quiz to keep going 🔥`,
        action: 'quiz-setup'
      });
    }, 1000 * 60 * 60 * 4); // 4 hours from load for demo
  }

  // 2. DAILY STUDY REMINDER
  if (settings.dailyReminder !== false) {
    // Simulated scheduling
    setTimeout(() => {
      addNotification({
        type: 'DAILY_STUDY_REMINDER',
        title: 'Daily Study Time',
        body: `Time to study, ${user?.name || ''}! Open PassMark and solve 3 questions. 💪`,
        action: 'home'
      });
    }, 1000 * 60 * 60 * 8); 
  }

  // 3. EXAM COUNTDOWN
  if (settings.examAlerts !== false && user?.examMonth && user?.examYear) {
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(user.examMonth);
    const examDate = new Date(parseInt(user.examYear), monthIndex, 1);
    const daysLeft = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));

    if (daysLeft === 30) {
      addNotification({ type: 'EXAM_COUNTDOWN', title: '1 month to go!', body: 'Focus on your weak subjects.', action: 'papers' });
    } else if (daysLeft === 7) {
      addNotification({ type: 'EXAM_COUNTDOWN', title: '1 week left!', body: 'Revise your past papers now.', action: 'papers' });
    } else if (daysLeft === 1) {
      addNotification({ type: 'EXAM_COUNTDOWN', title: 'Tomorrow is the day!', body: "You've prepared well. Trust yourself.", action: 'home' });
    }
  }

  localStorage.setItem('passmark_last_scheduled', today);
};
