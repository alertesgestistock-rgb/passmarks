import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

// Shared poller for the onboarding-rewards checklist. Any component that
// needs the live {eligible, claimed, tokens} map (banner, widget) uses this
// instead of duplicating the fetch — refetch() is called after every claim.
export function useOnboardingProgress() {
  const { user } = useUser();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase.rpc('get_onboarding_progress');
    if (!error && data) setProgress(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setProgress(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refetch();
  }, [user?.id, refetch]);

  return { progress, loading, refetch };
}
