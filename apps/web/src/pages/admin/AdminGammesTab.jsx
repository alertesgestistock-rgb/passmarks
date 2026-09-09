import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GAMME_CONTEXTS } from '@/lib/modelGammes';

const GAMME_IDS = ['economique', 'equilibre', 'studio'];
const GAMME_LABEL = { economique: '🪙 Économique', equilibre: '⚖️ Équilibré', studio: '✨ Studio' };
const RESOLUTIONS = ['1K', '2K', '4K'];

// Coût en tokens réellement facturé pour la combinaison actuelle d'une tuile — lu depuis les
// mêmes données que l'onglet "Modèles IA" (jamais recalculé/dupliqué) :
// - image : model_catalog.capabilities.credit_cost_by_resolution, exposé par admin_list_models()
//   sous pricing_display.by_resolution (ex. { '1K': 3, '2K': 4, '4K': 6 }).
// - vidéo : la ligne video_model_rates exacte (modèle + résolution + durée + input_class),
//   trouvée dans allVideoVariants (admin_list_video_rate_variants()), champ user_token_cost.
function tokenCostFor(ctx, row, models, allVideoVariants) {
  if (!row?.model_key) return null;
  if (ctx.kind === 'image') {
    const model = models.find(m => m.key === row.model_key);
    const byRes = model?.pricing_display?.by_resolution;
    if (byRes && row.resolution && byRes[row.resolution] != null) return byRes[row.resolution];
    return null;
  }
  if (row.resolution == null || row.duration_seconds == null) return null;
  const variant = allVideoVariants.find(v => (
    v.model_key === row.model_key && v.is_active
    && (!ctx.videoInputClass || v.input_class === ctx.videoInputClass)
    && v.resolution === row.resolution && Number(v.duration_seconds) === Number(row.duration_seconds)
  ));
  return variant ? variant.user_token_cost : null;
}

function TokenCostBadge({ cost }) {
  if (cost == null) return <span className="text-xs text-muted-foreground">— tokens</span>;
  return <span className="text-xs font-semibold text-primary">{cost} token{cost > 1 ? 's' : ''}</span>;
}

// -----------------------------------------------------------------------------
// Onglet admin "Gammes IA" — pour chaque écran de génération, regroupé par
// section (Personnage, Lieu/Objet, Éditeur de script, Studio IA...), choisit
// quel modèle exact (+ résolution pour l'image, + résolution/durée pour la
// vidéo) se cache derrière Économique/Équilibré/Studio côté utilisateur
// (QualityPicker.jsx). Un changement ici est immédiat côté utilisateur — pas
// de déploiement nécessaire (table model_gamme_settings + RPC
// admin_set_model_gamme, migrations 20260819000001 et 20260819000002).
//
// Éditeur de script et Studio IA (Production) sont deux écrans distincts —
// contextes séparés (ex. script-editor-images vs studio-images) même quand
// les valeurs par défaut sont identiques, pour pouvoir les régler
// indépendamment.
// -----------------------------------------------------------------------------

// Toutes les combinaisons résolution/durée de tous les modèles vidéo, chargées une seule fois
// (au lieu d'une requête par cellule) — sert à la fois à filtrer le menu "modèle" (n'afficher
// que ceux ayant au moins une combinaison active pour ce mode, cf. section "Modèles IA" — un
// modèle actif au niveau catalogue peut avoir 0 variante active, ex. Seedance 2.0 dans tes
// captures) et à peupler les menus résolution/durée avec UNIQUEMENT ce qui est activé.
function useAllVideoVariants() {
  return useQuery({
    queryKey: ['admin-video-variants-all'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_video_rate_variants');
      if (error) throw error;
      return data || [];
    },
  });
}

function VideoGammeControls({ modelKey, inputClass, resolution, duration, allVariants, onPick }) {
  const active = allVariants.filter(v => v.model_key === modelKey && v.is_active && (!inputClass || v.input_class === inputClass));
  const resolutions = [...new Set(active.map(v => v.resolution))];
  const durations = [...new Set(active.filter(v => v.resolution === resolution).map(v => Number(v.duration_seconds)))];

  if (!modelKey) return null;
  if (!active.length) return <p className="text-xs text-amber-600">Aucun tarif actif pour ce modèle sur ce mode — active-le d'abord dans « Modèles IA ».</p>;

  return (
    <>
      <Select value={resolutions.includes(resolution) ? resolution : ''} onValueChange={v => onPick(v, undefined)}>
        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Résolution…" /></SelectTrigger>
        <SelectContent>{resolutions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={durations.includes(duration) ? String(duration) : ''} onValueChange={v => onPick(undefined, Number(v))}>
        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Durée…" /></SelectTrigger>
        <SelectContent>{durations.map(d => <SelectItem key={d} value={String(d)}>{d} s</SelectItem>)}</SelectContent>
      </Select>
    </>
  );
}

// -----------------------------------------------------------------------------
// Onboarding First Story : UN SEUL modèle (pas de trio Économique/Équilibré/Studio,
// contrairement au reste de cette page) — l'utilisateur ne choisit rien pendant
// l'onboarding, donc une seule ligne à régler. Backée par first_story_model_settings
// (migration 20260820000013), lue directement (RLS authenticated) et écrite via
// admin_set_first_story_settings() (security definer + is_admin(), même pattern que
// admin_set_model_gamme). Le nombre de tokens attribués à l'inscription est éditable ici
// (budget_total) : c'est CE nombre, pas un calcul automatique, qui est réellement crédité
// à chaque nouveau compte par le trigger create_first_story_for_new_profile — la pastille
// "coût/image" à côté n'est qu'un indicateur pour t'aider à choisir le budget, elle ne
// remplace pas le champ.
function FirstStorySettingsCard({ models, imageCapabilities }) {
  const qc = useQueryClient();
  const { data: settings, isLoading, error: settingsError } = useQuery({
    queryKey: ['first-story-model-settings-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('first_story_model_settings').select('*').eq('id', true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [modelKey, setModelKey] = useState('');
  const [resolution, setResolution] = useState('');
  const [budgetTotal, setBudgetTotal] = useState('');

  useEffect(() => {
    if (!settings) return;
    setModelKey(settings.model_key || '');
    setResolution(settings.resolution || '');
    setBudgetTotal(String(settings.budget_total ?? ''));
  }, [settings]);

  // Seuls les modèles image actifs, sans clé fournisseur perso, ET scene_batch_ready sont
  // éligibles : l'onboarding enchaîne 1 portrait + 5 scènes liées à un même personnage, un
  // modèle non scene_batch_ready y échouerait (même garde-fou que admin_set_first_story_settings
  // côté serveur — revérifié ici juste pour ne pas proposer un choix qui échouera à coup sûr).
  const eligibleModels = useMemo(() => models.filter(m => {
    if (m.kind !== 'image' || !m.is_active) return false;
    const catalog = imageCapabilities.find(item => item.key === m.key);
    return !!catalog && catalog.is_active && !catalog.requires_own_key && !!catalog.capabilities?.scene_batch_ready;
  }), [models, imageCapabilities]);

  const supportedResolutions = useMemo(() => {
    const catalog = imageCapabilities.find(item => item.key === modelKey);
    return Array.isArray(catalog?.capabilities?.resolutions) ? catalog.capabilities.resolutions : [];
  }, [imageCapabilities, modelKey]);

  const perImageCost = useMemo(() => {
    const model = models.find(m => m.key === modelKey);
    const byRes = model?.pricing_display?.by_resolution;
    return byRes && resolution && byRes[resolution] != null ? byRes[resolution] : null;
  }, [models, modelKey, resolution]);

  const save = useMutation({
    mutationFn: async () => {
      const parsedBudget = Number(budgetTotal);
      if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) throw new Error('Nombre de tokens invalide');
      const { error } = await supabase.rpc('admin_set_first_story_settings', { p_model_key: modelKey, p_resolution: resolution, p_budget_total: parsedBudget });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Réglages onboarding mis à jour'); qc.invalidateQueries({ queryKey: ['first-story-model-settings-admin'] }); qc.invalidateQueries({ queryKey: ['first-story-model-settings'] }); },
    onError: err => toast.error(err?.message || 'Échec de la mise à jour'),
  });

  const parsedBudget = Number(budgetTotal);
  const canSave = !!modelKey && !!resolution && Number.isFinite(parsedBudget) && parsedBudget > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding First Story</CardTitle>
        <CardDescription>Modèle et budget de tokens attribués à chaque nouveau compte pour son premier portrait + ses 5 scènes — un seul modèle, pas de trio de gammes ici.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Chargement…</div>
        ) : settingsError ? (
          <p className="text-sm text-destructive">{settingsError.message}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Modèle</p>
              <Select value={modelKey} onValueChange={v => { setModelKey(v); const cat = imageCapabilities.find(item => item.key === v); const supported = Array.isArray(cat?.capabilities?.resolutions) ? cat.capabilities.resolutions : []; if (!supported.includes(resolution)) setResolution(supported[0] || ''); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choisir un modèle…" /></SelectTrigger>
                <SelectContent>{eligibleModels.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Résolution</p>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Résolution…" /></SelectTrigger>
                <SelectContent>{supportedResolutions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Tokens attribués à l'inscription</p>
              <Input type="number" min={1} value={budgetTotal} onChange={e => setBudgetTotal(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {perImageCost != null ? <>{perImageCost} token{perImageCost > 1 ? 's' : ''}/image — 6 images (1 portrait + 5 scènes) = {perImageCost * 6} tokens de coût réel</> : 'Coût inconnu pour ce couple modèle/résolution'}
              </p>
              <Button size="sm" disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Enregistrer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminGammesTab() {
  const qc = useQueryClient();

  const { data: models = [] } = useQuery({
    queryKey: ['admin-models'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_models');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: imageCapabilities = [] } = useQuery({
    queryKey: ['admin-image-model-capabilities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('model_catalog').select('key,kind,is_active,requires_own_key,capabilities').eq('kind', 'image');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allVideoVariants = [] } = useAllVideoVariants();

  const { data: settings = [], isLoading, error } = useQuery({
    queryKey: ['admin-model-gammes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_model_gammes');
      if (error) throw error;
      return data || [];
    },
  });

  const sections = useMemo(() => {
    const bySection = new Map();
    GAMME_CONTEXTS.forEach(ctx => {
      if (!bySection.has(ctx.section)) bySection.set(ctx.section, []);
      bySection.get(ctx.section).push(ctx);
    });
    return [...bySection.entries()];
  }, []);

  const setGamme = useMutation({
    mutationFn: async ({ context, gammeId, modelKey, resolution, duration }) => {
      const { error } = await supabase.rpc('admin_set_model_gamme', { p_context: context, p_gamme_id: gammeId, p_model_key: modelKey, p_resolution: resolution ?? null, p_duration_seconds: duration ?? null });
      if (error) throw error;
      return { context, gammeId, modelKey, resolution, duration };
    },
    onMutate: async ({ context, gammeId, modelKey, resolution, duration }) => {
      await qc.cancelQueries({ queryKey: ['admin-model-gammes'] });
      const previous = qc.getQueryData(['admin-model-gammes']);
      const model = models.find(m => m.key === modelKey);
      qc.setQueryData(['admin-model-gammes'], old => (old || []).map(row => (
        row.context === context && row.gamme_id === gammeId
          ? { ...row, model_key: modelKey ?? row.model_key, resolution: resolution ?? row.resolution, duration_seconds: duration ?? row.duration_seconds, model_label: model?.label || row.model_label }
          : row
      )));
      return { previous };
    },
    onError: (err, _vars, context) => { if (context?.previous) qc.setQueryData(['admin-model-gammes'], context.previous); toast.error(err?.message || 'Échec de la mise à jour'); },
    onSuccess: () => toast.success('Gamme mise à jour'),
    onSettled: () => { qc.invalidateQueries({ queryKey: ['admin-model-gammes'] }); qc.invalidateQueries({ queryKey: ['model_gamme_settings'] }); },
  });

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Chargement des gammes…</div>;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Gammes de qualité (Économique / Équilibré / Studio)</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Pour chaque écran de génération, choisis quel modèle précis (+ résolution pour l'image,
          + résolution/durée pour la vidéo) se cache derrière chaque gamme — c'est ce que voit
          l'utilisateur à la place du menu déroulant technique complet (toujours disponible en
          « avancé »). Le changement est immédiat, aucun déploiement requis.
        </p>
      </div>

      <FirstStorySettingsCard models={models} imageCapabilities={imageCapabilities} />

      {sections.map(([sectionLabel, contexts]) => (
        <Card key={sectionLabel}>
          <CardHeader>
            <CardTitle>{sectionLabel}</CardTitle>
            <CardDescription>{contexts.map(c => c.label).join(' · ')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {contexts.map(ctx => (
              <div key={ctx.id} className="space-y-2">
                <p className="text-sm font-semibold">{ctx.label} <span className="ml-1 text-xs font-normal text-muted-foreground">({ctx.kind === 'image' ? 'image' : 'vidéo'})</span></p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {GAMME_IDS.map(gammeId => {
                    const row = settings.find(s => s.context === ctx.id && s.gamme_id === gammeId);
                    const allowedImageResolutions = modelKey => {
                      const configured = ctx.allowedResolutions || RESOLUTIONS;
                      const capabilities = imageCapabilities.find(item => item.key === modelKey)?.capabilities;
                      const supported = capabilities?.resolutions;
                      if (ctx.allowedResolutions && (!Array.isArray(supported) || !supported.length)) return [];
                      // GPT Image 2 n'a aucun vrai paramètre de taille en pixels (voir
                      // generate-character-sheet/index.ts) : incompatible avec TOUT contexte "fiche"
                      // (ctx.allowedResolutions = ['2K','4K']) quelle que soit la résolution demandée,
                      // même si le catalogue annonce ces résolutions comme supportées pour d'autres
                      // usages (scènes, portraits) où ça reste correct. Repéré le 2026-08-20 : cette
                      // page laissait un admin le sélectionner ici sans avertissement, alors que
                      // generate-character-sheet/generate-ingredient-portrait le rejettent déjà.
                      if (ctx.allowedResolutions && capabilities?.input_style === "gptimage2") return [];
                      return Array.isArray(supported) && supported.length ? configured.filter(value => supported.includes(value)) : configured;
                    };
                    // Pour la vidéo : ne proposer que les modèles actifs qui ont AU MOINS une
                    // combinaison résolution/durée activée dans "Modèles IA" pour ce mode précis
                    // (image de départ / texte seul) — un modèle "actif" au niveau catalogue
                    // mais à 0 variante active (ex. Seedance 2.0 dans tes captures) ne doit pas
                    // apparaître ici, il serait inutilisable une fois choisi.
                    const options = ctx.kind === 'video'
                      ? models.filter(m => m.kind === 'video' && m.is_active && allVideoVariants.some(v => v.model_key === m.key && v.is_active && (!ctx.videoInputClass || v.input_class === ctx.videoInputClass)))
                      : models.filter(m => {
                        if (m.kind !== ctx.kind || !m.is_active) return false;
                        if (!ctx.allowedResolutions) return true;
                        const catalog = imageCapabilities.find(item => item.key === m.key);
                        return !!catalog && catalog.is_active && !catalog.requires_own_key && allowedImageResolutions(m.key).length > 0;
                      });
                    const imageResolutions = ctx.kind === 'image' ? allowedImageResolutions(row?.model_key) : [];
                    // Avertissement affiché quand une ligne déjà enregistrée pointe vers un modèle
                    // ou une variante devenu(e) inactif(ve) depuis ailleurs (onglet "Modèles IA") —
                    // jusqu'ici le champ se contentait de s'afficher vide (placeholder), sans rien
                    // signaler activement : repéré le 2026-08-21 après que 5 lignes vidéo se soient
                    // retrouvées en échec silencieux ("video_rate_unavailable" au clic sur Générer)
                    // suite à la désactivation d'une variante 10s ailleurs, sans que rien ici ne
                    // l'ait signalé. La valeur reste stockée telle quelle en base tant que la ligne
                    // n'est pas resélectionnée et réenregistrée — ce bandeau force à s'en rendre compte.
                    const modelStale = !!row?.model_key && !options.some(m => m.key === row.model_key);
                    const staleWarning = modelStale
                      ? 'Modèle désactivé depuis « Modèles IA » — choisissez-en un autre.'
                      : ctx.kind === 'image'
                        ? (row?.resolution && !imageResolutions.includes(row.resolution) ? 'Résolution devenue indisponible pour ce modèle — resélectionnez-la.' : null)
                        : (row?.resolution != null && row?.duration_seconds != null && !allVideoVariants.some(v => v.model_key === row.model_key && v.is_active && (!ctx.videoInputClass || v.input_class === ctx.videoInputClass) && v.resolution === row.resolution && Number(v.duration_seconds) === Number(row.duration_seconds))
                          ? 'Cette variante (résolution/durée) a été désactivée depuis « Modèles IA » — resélectionnez-la, sinon la génération échouera au clic.'
                          : null);
                    return (
                      <div key={gammeId} className="space-y-1.5 rounded-lg border p-3">
                        <p className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                          <span>{GAMME_LABEL[gammeId]}</span>
                          <TokenCostBadge cost={tokenCostFor(ctx, row, models, allVideoVariants)} />
                        </p>
                        <Select
                          value={row?.model_key || ''}
                          onValueChange={v => { const supported = allowedImageResolutions(v); setGamme.mutate({ context: ctx.id, gammeId, modelKey: v, resolution: ctx.kind === 'image' ? (supported.includes(row?.resolution) ? row.resolution : supported[0] || row?.resolution || '1K') : null, duration: ctx.kind === 'image' ? null : undefined }); }}
                        >
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choisir un modèle…" /></SelectTrigger>
                          <SelectContent>{options.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
                        </Select>
                        {ctx.kind === 'image' && (
                          <Select
                            value={imageResolutions.includes(row?.resolution) ? row.resolution : ''}
                            onValueChange={v => setGamme.mutate({ context: ctx.id, gammeId, modelKey: row?.model_key, resolution: v })}
                          >
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>{imageResolutions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                        {ctx.kind === 'video' && (
                          <VideoGammeControls
                            modelKey={row?.model_key}
                            inputClass={ctx.videoInputClass}
                            resolution={row?.resolution}
                            duration={row?.duration_seconds}
                            allVariants={allVideoVariants}
                            onPick={(r, d) => setGamme.mutate({
                              context: ctx.id, gammeId, modelKey: row?.model_key,
                              resolution: r !== undefined ? r : row?.resolution,
                              duration: d !== undefined ? d : row?.duration_seconds,
                            })}
                          />
                        )}
                        {staleWarning && <p className="text-xs font-medium text-amber-600">⚠️ {staleWarning}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
