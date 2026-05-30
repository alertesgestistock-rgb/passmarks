import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { loadUserFromLocalStorage, saveUserToLocalStorage, clearUserData, checkAndUpdateStreak } from '@/lib/userStorage';

const UserContext = createContext(null);

const profileToUser = (profile, email) => ({
  id: profile.id,
  email,
  name: profile.name,
  level: profile.level,
  subjects: profile.subjects || [],
  examMonth: profile.exam_month,
  examYear: profile.exam_year,
  apiKey: profile.api_key || '',
  stats: profile.stats || { questionsSolved: 0, papersRead: 0, quizzesCompleted: 0, totalScore: 0, bySubject: {} },
  recentActivity: profile.recent_activity || [],
  chatHistory: profile.chat_history || [],
  quizHistory: profile.quiz_history || [],
});

const userToProfile = (updates) => {
  const map = {
    name: 'name', level: 'level', subjects: 'subjects',
    examMonth: 'exam_month', examYear: 'exam_year', apiKey: 'api_key',
    stats: 'stats', recentActivity: 'recent_activity',
    chatHistory: 'chat_history', quizHistory: 'quiz_history',
  };
  const result = {};
  for (const [key, col] of Object.entries(map)) {
    if (updates[key] !== undefined) result[col] = updates[key];
  }
  return result;
};

export const UserProvider = ({ children }) => {
  const cached = loadUserFromLocalStorage();
  const [user, setUser] = useState(cached || null);
  const [streak, setStreak] = useState(() => cached ? checkAndUpdateStreak() : { current: 0, lastActive: null });
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;

    const loadFromSession = async (session) => {
      if (!session) return false;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (cancelled) return false;
      if (profile) {
        const userData = profileToUser(profile, session.user.email);
        setUser(userData);
        saveUserToLocalStorage(userData);
        setStreak(checkAndUpdateStreak());
        return true;
      }
      return false;
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const loaded = await loadFromSession(session);
      if (!loaded && !cancelled && !cached) {
        // No session and no cache — nothing to show
      }
      if (!cancelled) setIsLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await loadFromSession(session);
        setIsLoading(false);
      }
      if (event === 'SIGNED_OUT') {
        clearUserData();
        setUser(null);
        setStreak({ current: 0, lastActive: null });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const updateUser = async (updates) => {
    setUser(prev => {
      if (!prev) return prev;
      const newUser = { ...prev, ...updates };
      saveUserToLocalStorage(newUser);
      return newUser;
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const dbUpdates = userToProfile(updates);
      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('profiles').update(dbUpdates).eq('id', session.user.id);
      }
    }
  };

  const initializeNewUser = async (name, level, subjects, examMonth, examYear) => {
    const { data: { session } } = await supabase.auth.getSession();
    const newUser = {
      id: session?.user?.id || null,
      email: session?.user?.email || null,
      name, level, subjects, examMonth, examYear,
      apiKey: '',
      stats: { questionsSolved: 0, papersRead: 0, quizzesCompleted: 0, totalScore: 0, bySubject: {} },
      recentActivity: [],
      chatHistory: [],
      quizHistory: [],
    };
    setUser(newUser);
    saveUserToLocalStorage(newUser);
    setStreak(checkAndUpdateStreak());

    if (session) {
      await supabase.from('profiles').upsert({
        id: session.user.id,
        name, level, subjects,
        exam_month: examMonth,
        exam_year: examYear,
      });
    }
  };

  const addRecentActivity = (activity) => {
    setUser(prev => {
      if (!prev) return prev;
      const newActivity = [{ ...activity, id: Date.now() }, ...(prev.recentActivity || [])].slice(0, 10);
      const newUser = { ...prev, recentActivity: newActivity };
      saveUserToLocalStorage(newUser);
      // Async Supabase sync (fire-and-forget)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase.from('profiles').update({ recent_activity: newActivity }).eq('id', session.user.id);
        }
      });
      return newUser;
    });
  };

  const clearUser = async () => {
    clearUserData();
    setUser(null);
    setStreak({ current: 0, lastActive: null });
    await supabase.auth.signOut();
  };

  return (
    <UserContext.Provider value={{
      user, streak, isLoading,
      updateUser, initializeNewUser, addRecentActivity, clearUser,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};
