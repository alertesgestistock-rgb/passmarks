
export const saveUserToLocalStorage = (user) => {
  try {
    localStorage.setItem('passmark_user', JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save user to localStorage:', error);
  }
};

export const loadUserFromLocalStorage = () => {
  try {
    const data = localStorage.getItem('passmark_user');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load user from localStorage:', error);
    return null;
  }
};

export const clearUserData = () => {
  try {
    localStorage.removeItem('passmark_user');
    localStorage.removeItem('claude_api_key');
    localStorage.removeItem('passmark_streak');
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
};

export const checkAndUpdateStreak = () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let streak = JSON.parse(localStorage.getItem('passmark_streak') || '{"current": 0, "lastActive": null}');
    
    if (streak.lastActive === today) return streak;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (streak.lastActive === yesterdayStr) {
      streak.current += 1;
    } else {
      streak.current = 1;
    }
    
    streak.lastActive = today;
    localStorage.setItem('passmark_streak', JSON.stringify(streak));
    return streak;
  } catch (error) {
    console.error('Failed to update streak:', error);
    return { current: 0, lastActive: null };
  }
};

// Helpers
export const monthToIndex = (monthStr) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.indexOf(monthStr);
};

export const getTimeGreeting = (name) => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return `Good morning, ${name} ☀️`;
  if (hour >= 12 && hour < 18) return `Good afternoon, ${name} 👋`;
  if (hour >= 18 && hour < 23) return `Good evening, ${name} 🌙`;
  return `Still grinding, ${name}? 💪`;
};

export const calculateDaysToExam = (monthStr, yearStr) => {
  const examDate = new Date(parseInt(yearStr), monthToIndex(monthStr), 1);
  return Math.ceil((examDate - new Date()) / 86400000);
};

export const getStreakColor = (streakCount) => {
  if (streakCount >= 7) return 'text-[#22C55E]';
  if (streakCount >= 3) return 'text-[#F97316]';
  return 'text-[#64748B]';
};
