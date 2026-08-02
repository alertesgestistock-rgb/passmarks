import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { runMobileSafeRequest } from '@/lib/mobileRequest';
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
  avatarUrl: profile.avatar_url || null,
  phone: profile.phone || null,
  phoneCountry: profile.phone_country || '237',
  stats: profile.stats || { questionsSolved: 0, papersRead: 0, quizzesCompleted: 0, totalScore: 0, bySubject: {} },
  recentActivity: profile.recent_activity || [],
});

const userToProfile = (updates) => {
  const map = {
    name: 'name', level: 'level', subjects: 'subjects',
    examMonth: 'exam_month', examYear: 'exam_year',
    avatarUrl: 'avatar_url',
    phone: 'phone', phoneCountry: 'phone_country',
    stats: 'stats', recentActivity: 'recent_activity',
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
  const [tokenBalance, setTokenBalance] = useState(null);

  const ensureWallet = async (userId) => {
    // Wallet is created automatically by the handle_new_profile_wallet DB trigger.
    // We only read here — never write from the browser (security: prevents F12 abuse).
    const { data: wallet } = await runMobileSafeRequest(signal => supabase
      .from('token_wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle()
      .abortSignal(signal));
    return wallet?.balance ?? 0;
  };

  useEffect(() => {
    let cancelled = false;
    let initialized = false; // évite le double appel init() + SIGNED_IN

    const loadFromSession = async (session) => {
      if (!session) return false;
      const { data: profile } = await runMobileSafeRequest(signal => supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .abortSignal(signal));

      if (cancelled) return false;
      if (profile) {
        const userData = profileToUser(profile, session.user.email);
        setUser(userData);
        saveUserToLocalStorage(userData);
        setStreak(checkAndUpdateStreak());

        // Apply pending referral code (set during signup when email confirmation was required)
        const pendingReferral = localStorage.getItem('pm_pending_referral');
        if (pendingReferral) {
          localStorage.removeItem('pm_pending_referral');
          supabase.rpc('apply_referral', {
            p_code: pendingReferral,
            p_referred_id: session.user.id,
          }).catch(() => {});
        }

        // Load wallet balance (non-blocking)
        ensureWallet(session.user.id).then((balance) => {
          if (!cancelled) setTokenBalance(balance);
        });

        // Record the browser's timezone once per session so the onboarding
        // rewards streak/day math uses the user's local calendar day.
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (tz) supabase.rpc('set_onboarding_timezone', { p_timezone: tz }).catch(() => {});
        } catch (_) { /* silent — non-critical */ }

        return true;
      }
      return false;
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await loadFromSession(session);
      initialized = true;
      if (!cancelled) setIsLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        // Ignorer le SIGNED_IN qui suit immédiatement init() — même session
        if (initialized) await loadFromSession(session);
        setIsLoading(false);
      }
      if (event === 'SIGNED_OUT') {
        clearUserData();
        setUser(null);
        setStreak({ current: 0, lastActive: null });
        setTokenBalance(null);
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
      avatarUrl: null,
      stats: { questionsSolved: 0, papersRead: 0, quizzesCompleted: 0, totalScore: 0, bySubject: {} },
      recentActivity: [],
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
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase.from('profiles').update({ recent_activity: newActivity }).eq('id', session.user.id);
        }
      });
      return newUser;
    });
  };

  // Called after API responses include balance_after
  const updateTokenBalance = (newBalance) => {
    if (typeof newBalance === 'number') setTokenBalance(newBalance);
  };

  // Reload balance from DB (e.g. after returning from Chariow payment)
  const refreshTokenBalance = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: wallet } = await supabase
      .from('token_wallets')
      .select('balance')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (wallet) setTokenBalance(wallet.balance);
  };

  const clearUser = async () => {
    clearUserData();
    setUser(null);
    setStreak({ current: 0, lastActive: null });
    await supabase.auth.signOut();
  };

  return (
    <UserContext.Provider value={{
      user, streak, isLoading, tokenBalance,
      updateUser, initializeNewUser, addRecentActivity, clearUser,
      updateTokenBalance, refreshTokenBalance,
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
