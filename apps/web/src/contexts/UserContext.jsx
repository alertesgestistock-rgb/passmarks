import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getSessionSafe } from '@/lib/supabase';
import { runMobileSafeRequest } from '@/lib/mobileRequest';
import { loadUserFromLocalStorage, saveUserToLocalStorage, clearUserData, checkAndUpdateStreak } from '@/lib/userStorage';
import { useTelegram } from '@/hooks/useTelegram';

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

// Asks telegram-login whether this Telegram id is already linked to a
// PassMark account, without creating anything. Distinguishes "returning
// Telegram user, safe to auto sign in" from "unknown — might already have
// an account under email/password, must ask before creating a duplicate".
const checkTelegramLinked = async (initData) => {
  try {
    const { data, error } = await supabase.functions.invoke('telegram-login', { body: { initData, checkOnly: true } });
    if (error) { console.warn('[UserContext] Telegram link check failed:', error); return null; }
    return Boolean(data?.linked);
  } catch (err) {
    console.warn('[UserContext] Telegram link check error:', err);
    return null;
  }
};

// Exchanges Telegram's initData for a real Supabase session, via the
// telegram-login Edge Function (HMAC-verifies initData server-side, then
// issues a magic-link token we redeem immediately). Only call this once the
// Telegram id is either already linked, or the user explicitly chose
// "Continue with Telegram" (accepting a new account) — never silently on
// an unknown id. No-op resolves to false on any failure — callers fall back
// to the normal auth flow.
const signInWithTelegram = async (initData) => {
  try {
    const { data, error } = await supabase.functions.invoke('telegram-login', { body: { initData } });
    if (error || !data?.token_hash || !data?.email) {
      console.warn('[UserContext] Telegram login failed:', error);
      return false;
    }
    // token_hash (from admin.generateLink) is a self-contained credential —
    // it must be verified alone, NOT combined with email/token (that's the
    // separate 6-digit-OTP flow and mixing the two fails silently).
    // https://supabase.com/docs/reference/javascript/auth-verifyotp
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: 'magiclink',
    });
    if (otpError) {
      console.warn('[UserContext] Telegram session exchange failed:', otpError);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[UserContext] Telegram login error:', err);
    return false;
  }
};

// Links the given Telegram initData to whichever account is signed in RIGHT
// NOW (must be called right after a successful signup/signin performed
// inside Telegram) — see telegram-link Edge Function.
const linkTelegramToCurrentAccount = async (initData) => {
  try {
    const { data, error } = await supabase.functions.invoke('telegram-link', { body: { initData } });
    if (error) { console.warn('[UserContext] Telegram link failed:', error); return false; }
    return Boolean(data?.ok);
  } catch (err) {
    console.warn('[UserContext] Telegram link error:', err);
    return false;
  }
};

export const UserProvider = ({ children }) => {
  const { isTelegram, initData } = useTelegram();
  const cached = loadUserFromLocalStorage();
  const [user, setUser] = useState(cached || null);
  const [streak, setStreak] = useState(() => cached ? checkAndUpdateStreak() : { current: 0, lastActive: null });
  const [isLoading, setIsLoading] = useState(!cached);
  const [tokenBalance, setTokenBalance] = useState(null);
  // null = not applicable / not checked yet, 'unknown' = inside Telegram but
  // this telegram_id has never been seen before — AuthPage must ask the user
  // whether to create a new account or sign in to an existing one first.
  const [telegramChoice, setTelegramChoice] = useState(null);

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
      // getSessionSafe() garantit qu'on ne reste jamais bloqué ici (verrou
      // d'auth interne à supabase-js qui peut pendre indéfiniment côté
      // mobile/PWA) — sans quoi setIsLoading(false) n'est jamais atteint et
      // toute l'app reste figée sur l'écran de chargement.
      try {
        const { data: { session } } = await getSessionSafe();
        const loaded = await loadFromSession(session);

        // No existing session, but we're inside Telegram with signed
        // initData: check FIRST whether this telegram_id is already known.
        // Only auto-sign-in for a *returning* Telegram user — an unknown id
        // might belong to someone who already has a PassMark account under
        // email/password (Telegram's WebView storage is isolated, so we'd
        // never see their existing session). For those, AuthPage shows a
        // choice screen instead of silently creating a duplicate account.
        if (!loaded && isTelegram && initData) {
          const linked = await checkTelegramLinked(initData);
          if (linked === true) {
            const signedIn = await signInWithTelegram(initData);
            if (signedIn && !cancelled) {
              const { data: { session: newSession } } = await getSessionSafe();
              await loadFromSession(newSession);
            }
          } else if (linked === false && !cancelled) {
            setTelegramChoice('unknown');
          }
        }
      } catch (err) {
        console.warn('[UserContext] init() session fetch failed:', err);
      } finally {
        initialized = true;
        if (!cancelled) setIsLoading(false);
      }
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

    const { data: { session } } = await getSessionSafe();
    if (session) {
      const dbUpdates = userToProfile(updates);
      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('profiles').update(dbUpdates).eq('id', session.user.id);
      }
    }
  };

  const initializeNewUser = async (name, level, subjects, examMonth, examYear) => {
    const { data: { session } } = await getSessionSafe();
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
      getSessionSafe().then(({ data: { session } }) => {
        if (session) {
          supabase.from('profiles').update({ recent_activity: newActivity }).eq('id', session.user.id);
        }
      }).catch(() => {});
      return newUser;
    });
  };

  // Called after API responses include balance_after
  const updateTokenBalance = (newBalance) => {
    if (typeof newBalance === 'number') setTokenBalance(newBalance);
  };

  // Reload balance from DB (e.g. after returning from Chariow payment)
  const refreshTokenBalance = async () => {
    try {
      const { data: { session } } = await getSessionSafe();
      if (!session) return;
      const { data: wallet } = await supabase
        .from('token_wallets')
        .select('balance')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (wallet) setTokenBalance(wallet.balance);
    } catch (err) {
      console.warn('[UserContext] refreshTokenBalance failed:', err);
    }
  };

  const clearUser = async () => {
    clearUserData();
    setUser(null);
    setStreak({ current: 0, lastActive: null });
    await supabase.auth.signOut();
  };

  // "Continue with Telegram" choice: creates/signs into the Telegram-linked
  // account for this initData (only meaningful when telegramChoice === 'unknown').
  const continueWithTelegram = async () => {
    if (!initData) return false;
    // verifyOtp() inside signInWithTelegram fires a SIGNED_IN auth event,
    // which the onAuthStateChange subscription below already handles
    // (loads the profile, sets `user`) — no manual reload needed here.
    const signedIn = await signInWithTelegram(initData);
    if (signedIn) setTelegramChoice(null);
    return signedIn;
  };

  // "I already have an account" choice, called right after a successful
  // email signup/signin performed inside Telegram — attaches telegram_id to
  // that just-authenticated account so future Telegram opens auto sign in.
  const linkCurrentAccountToTelegram = async () => {
    if (!isTelegram || !initData) return false;
    const linked = await linkTelegramToCurrentAccount(initData);
    if (linked) setTelegramChoice(null);
    return linked;
  };

  return (
    <UserContext.Provider value={{
      user, streak, isLoading, tokenBalance,
      updateUser, initializeNewUser, addRecentActivity, clearUser,
      updateTokenBalance, refreshTokenBalance,
      isTelegram, telegramChoice, continueWithTelegram, linkCurrentAccountToTelegram,
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
