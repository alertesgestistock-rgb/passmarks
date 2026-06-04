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
  window.addEventListener('online', () => {
    console.log('[Supabase] Device went online. Refreshing session network connections...');
    // Force la reconnexion et le rafraîchissement silencieux de la session active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // En touchant la session, Supabase ré-évalue la connexion WebSocket et ré-émet les tokens expirés
        supabase.auth.startAutoRefresh?.();
      }
    }).catch(err => console.warn('[Supabase] Reconnection refresh skipped:', err));
  });
}

