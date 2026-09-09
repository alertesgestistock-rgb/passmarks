import { useEffect, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';

// -----------------------------------------------------------------------------
// Sends a light heartbeat every 60s while the tab is visible, feeding
// public.user_activity_heartbeats (see
// supabase/migrations/20260910140000_018_activity_heartbeats.sql). Powers,
// in the admin Users tab:
//  - "online now": last heartbeat < 90s (see admin_user_activity)
//  - "time spent": cumulative session duration over a period
//
// Ported from Raconty's ActivityHeartbeat.jsx (same session-id/upsert
// design, same 60s interval). No separate Realtime Presence channel —
// one mechanism for both needs.
//
// session_id is generated once per browser tab (sessionStorage, not
// localStorage: two open tabs = two distinct sessions, which is correct for
// session_count). Mounted once near the top of the app; renders nothing.
// -----------------------------------------------------------------------------

const HEARTBEAT_INTERVAL_MS = 60000;
const SESSION_STORAGE_KEY = 'passmark_activity_session_id';

function getOrCreateSessionId() {
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

export default function ActivityHeartbeat() {
  const { user } = useUser();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    const sessionId = getOrCreateSessionId();

    const sendHeartbeat = () => {
      if (document.visibilityState !== 'visible') return;
      supabase.rpc('record_heartbeat', { p_session_id: sessionId }).then(({ error }) => {
        if (error) {
          // Silent: a missed heartbeat only affects the admin "online" badge
          // freshness, never the user's own experience.
        }
      });
    };

    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', sendHeartbeat);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', sendHeartbeat);
    };
  }, [user?.id]);

  return null;
}
