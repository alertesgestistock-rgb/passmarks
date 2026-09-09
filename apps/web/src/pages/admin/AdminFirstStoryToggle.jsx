import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';

// -----------------------------------------------------------------------------
// Toggle admin : active/désactive le parcours d'onboarding « First Story »
// pour les FUTURES inscriptions (voir migration
// 20260812000002_admin_toggle_first_story_onboarding.sql). N'affecte jamais
// les comptes déjà créés — le trigger profiles_create_first_story ne joue
// qu'à l'inscription. Désactivé = les nouveaux comptes arrivent directement
// sur le dashboard (comportement identique aux comptes créés avant
// l'installation du parcours First Story).
// -----------------------------------------------------------------------------

export default function AdminFirstStoryToggle() {
  const qc = useQueryClient();
  const { data: enabled, isLoading } = useQuery({
    queryKey: ['admin-first-story-onboarding-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_first_story_onboarding_enabled');
      if (error) throw error;
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async next => {
      const { data, error } = await supabase.rpc('admin_set_first_story_onboarding_enabled', { p_enabled: next });
      if (error) throw error;
      return !!data;
    },
    onSuccess: next => {
      qc.setQueryData(['admin-first-story-onboarding-enabled'], next);
      toast.success(next ? 'Onboarding First Story activé pour les nouvelles inscriptions' : 'Onboarding First Story désactivé — les nouveaux comptes iront direct au dashboard');
    },
    onError: error => toast.error(error?.message || 'Échec de la mise à jour'),
  });

  return (
    <div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
      <span className="text-sm text-muted-foreground whitespace-nowrap">Onboarding First Story</span>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          checked={!!enabled}
          disabled={toggle.isPending}
          onCheckedChange={next => toggle.mutate(next)}
          aria-label="Activer ou désactiver l'onboarding First Story pour les nouvelles inscriptions"
        />
      )}
    </div>
  );
}
