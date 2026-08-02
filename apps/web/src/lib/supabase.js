import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing — auth and cloud sync will be disabled.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      // Configuration robuste des requêtes réseau avec fetch natif et retries automatiques
      headers: {
        'x-client-info': 'passmark-web',
      },
    },
  }
);

// Rendre le client Supabase résilient au réseau lors de la sortie de veille sur mobile / PWA
if (typeof window !== 'undefined') {
  const triggerReconnection = () => {
    console.log('[Supabase] App active/online. Re-evaluating network session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.auth.startAutoRefresh?.();
      }
    }).catch(err => console.warn('[Supabase] Reconnection refresh skipped:', err));
  };

  const isIosPwa = /iPad|iPhone|iPod/.test(navigator.userAgent)
    && (navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches);
  let hiddenAt = 0;
  let recoveryScheduled = false;

  window.addEventListener('online', triggerReconnection);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      hiddenAt = Date.now();
      return;
    }

    triggerReconnection();

    // iOS standalone PWAs can keep HTTP/SSE requests permanently frozen after
    // backgrounding. A normal JS retry cannot recover a promise that never
    // settles, while a page reload reliably creates fresh network connections.
    if (isIosPwa && hiddenAt && Date.now() - hiddenAt > 1000 && !recoveryScheduled) {
      recoveryScheduled = true;
      window.setTimeout(() => {
        if (document.visibilityState === 'visible') window.location.reload();
      }, 250);
    }
  });
  window.addEventListener('focus', triggerReconnection);
}


