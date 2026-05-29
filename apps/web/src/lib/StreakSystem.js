
export const initializeStreak = () => {
  const existing = localStorage.getItem('passmark_streak');
  if (!existing) {
    const initialStreak = { current: 0, longest: 0, lastActive: null };
    localStorage.setItem('passmark_streak', JSON.stringify(initialStreak));
    return initialStreak;
  }
  return JSON.parse(existing);
};

export const getStreakStatus = () => {
  return initializeStreak();
};

export const updateStreak = () => {
  const streak = initializeStreak();
  const today = new Date().setHours(0, 0, 0, 0);
  const lastActive = streak.lastActive ? new Date(streak.lastActive).setHours(0, 0, 0, 0) : null;

  let isNewDay = false;
  let milestone = null;

  if (!lastActive) {
    streak.current = 1;
    streak.longest = 1;
    isNewDay = true;
  } else {
    const diffDays = Math.round((today - lastActive) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak.current += 1;
      if (streak.current > streak.longest) {
        streak.longest = streak.current;
      }
      isNewDay = true;
    } else if (diffDays > 1) {
      streak.current = 1;
      isNewDay = true;
    }
  }

  if (isNewDay) {
    streak.lastActive = new Date().toISOString();
    localStorage.setItem('passmark_streak', JSON.stringify(streak));
    milestone = checkStreakMilestones(streak.current);
  }

  return { ...streak, isNewDay, milestone };
};

export const checkStreakMilestones = (current) => {
  if (current === 3) return "3-day streak! You're building a habit. Keep going 🔥";
  if (current === 7) return "1 week streak! You're serious about your GCE. Grade A incoming ⭐";
  if (current === 30) return "30 days! You're a PassMark legend 🏆 Share your streak!";
  return null;
};
