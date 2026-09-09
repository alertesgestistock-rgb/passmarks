import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, TriangleAlert, ChevronDown, ChevronRight, BadgeCheck, ShieldQuestion, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

// Options du filtre "Type" : les deux premières recoupent kind, les
// suivantes affinent par tier (uniquement pertinent pour kind='video' — les
// modèles image n'ont pas de tier). Doit rester synchro avec TIER_LABEL.
const TYPE_FILTER_OPTIONS = [
  ['all', 'Tous les types'],
  ['image', 'Image'],
  ['video', 'Vidéo (tous)'],
  ['standard', 'Vidéo standard'],
  ['premium', 'Vidéo premium'],
  ['avatar', 'Avatar'],
  ['lipsync', 'Lipsync'],
  ['motion_control', 'Motion control'],
];

// -----------------------------------------------------------------------------
// Onglet admin "Modèles IA" — active/désactive un modèle du model_catalog
// (image, vidéo standard, avatar, lipsync, motion control) sans SQL manuel.
//
// La colonne "Tarif" affiche le VRAI mode de calcul de chaque modèle, lu
// depuis pricing_display (admin_list_models(), migration
// 20260813000007_admin_models_clear_pricing.sql) — jamais model_catalog.
// token_cost seul, qui n'est qu'un champ de compatibilité et ne correspond
// pas toujours au prix réellement facturé :
//   - "per_second"    (avatar/lipsync/motion control) : X tokens chaque
//     seconde de la vidéo produite, jusqu'à une durée maximale.
//   - "per_variant"    (vidéo standard/premium) : le prix dépend de la
//     résolution/durée choisie — une ligne video_model_rates par
//     combinaison, dépliable (chevron) pour les voir/activer une par une.
//   - "per_resolution" (image) : le prix dépend de la résolution demandée
//     (1K/2K/4K...), lu dans model_catalog.capabilities.
//   - "flat" (repli) : un seul prix fixe, aucune variable connue.
//
// Le switch modèle (admin_set_model_active) bascule model_catalog.is_active
// + la table de tarif correspondante — sauf pour "per_variant" : désactiver
// coupe toutes les variantes (interrupteur d'urgence), mais activer ne force
// plus aucune variante — chaque ligne se règle indépendamment ci-dessous.
//
// Badge "Vérifié"/"Non vérifié" sous le nom du modèle (migration
// 20260813000011_admin_verification_badges.sql) : indique si le mapping de
// champs (capabilities.input_map) et le tarif ont été confirmés contre la
// vraie doc Replicate collée par le porteur du projet, ou reposent encore
// sur une estimation. Cliquable vers la source quand elle est connue.
// -----------------------------------------------------------------------------

const TIER_LABEL = {
  avatar: 'Avatar', lipsync: 'Lipsync', motion_control: 'Motion control',
  premium: 'Vidéo premium', standard: 'Vidéo standard',
};

/** Indique si le mapping de champs (schema_verified) et le tarif (pricing_verified_at) du modèle
 * ont été confirmés contre la vraie doc Replicate, ou reposent encore sur une estimation. Sans ça,
 * cette info existe en base mais est invisible en admin — voir migration
 * 20260813000011_admin_verification_badges.sql. */
function VerificationBadge({ schemaVerified, schemaVerifiedAt, pricingVerifiedAt, pricingSourceUrl }) {
  const verified = !!schemaVerified && !!pricingVerifiedAt;
  const date = schemaVerifiedAt || pricingVerifiedAt;
  const label = date ? new Date(date).toLocaleDateString('fr-FR') : null;
  if (verified) {
    return (
      <a
        href={pricingSourceUrl || undefined}
        target="_blank" rel="noreferrer"
        onClick={e => { if (!pricingSourceUrl) e.preventDefault(); }}
        className="mt-1 flex w-fit items-center gap-1 text-xs text-emerald-600 hover:underline"
        title={pricingSourceUrl || undefined}
      >
        <BadgeCheck className="h-3.5 w-3.5" />
        Vérifié{label ? ` le ${label}` : ''}
      </a>
    );
  }
  return (
    <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground" title="Champs/tarif non confirmés contre la doc officielle Replicate — estimation.">
      <ShieldQuestion className="h-3.5 w-3.5" />
      Non vérifié
    </span>
  );
}

function tierBadge(kind, tier) {
  if (kind === 'image') return <Badge variant="outline">Image</Badge>;
  const label = TIER_LABEL[tier] || 'Vidéo';
  return <Badge variant="outline">{label}</Badge>;
}

/** Traduit pricing_display en texte + petite légende, pour que le mode de calcul soit lisible
 * sans avoir besoin de connaître le schéma de la base. */
function PricingCell({ pricing }) {
  if (!pricing) return <span className="text-muted-foreground">—</span>;
  if (pricing.kind === 'per_second') {
    return (
      <div>
        <p className="font-medium">{pricing.tokens_per_second} tokens / seconde</p>
        <p className="text-xs text-muted-foreground">jusqu'à {pricing.max_duration_seconds}s max</p>
      </div>
    );
  }
  if (pricing.kind === 'per_variant') {
    return (
      <div>
        <p className="font-medium">{pricing.min_tokens} → {pricing.max_tokens} tokens</p>
        <p className="text-xs text-muted-foreground">selon résolution/durée · {pricing.active_variant_count}/{pricing.variant_count} variante(s) active(s) — voir ci-dessous ↓</p>
      </div>
    );
  }
  if (pricing.kind === 'per_resolution') {
    const entries = Object.entries(pricing.by_resolution || {});
    return (
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm">
        {entries.map(([resolution, cost]) => (
          <span key={resolution} className="whitespace-nowrap"><span className="font-medium">{resolution}</span> : {cost}t</span>
        ))}
        {!entries.length && <span className="text-muted-foreground">résolution non renseignée</span>}
      </div>
    );
  }
  return <p className="font-medium">{pricing.tokens} tokens <span className="font-normal text-xs text-muted-foreground">(prix fixe)</span></p>;
}

function VariantRows({ modelKey }) {
  const qc = useQueryClient();
  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['admin-video-variants', modelKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_video_rate_variants', { p_model_key: modelKey });
      if (error) throw error;
      return data || [];
    },
  });

  const toggleVariant = useMutation({
    mutationFn: async ({ id, active }) => {
      const { data, error } = await supabase.rpc('admin_set_video_rate_variant_active', { p_id: id, p_active: active });
      if (error) throw error;
      return { id, active: !!data };
    },
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: ['admin-video-variants', modelKey] });
      const previous = qc.getQueryData(['admin-video-variants', modelKey]);
      qc.setQueryData(['admin-video-variants', modelKey], old => (old || []).map(v => (v.id === id ? { ...v, is_active: active } : v)));
      return { previous };
    },
    onError: (error, _vars, context) => { if (context?.previous) qc.setQueryData(['admin-video-variants', modelKey], context.previous); toast.error(error?.message || 'Échec de la mise à jour'); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-models'] }),
  });

  if (isLoading) return <TableRow><TableCell colSpan={4} className="py-4 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Chargement des variantes…</TableCell></TableRow>;
  if (!variants.length) return <TableRow><TableCell colSpan={4} className="py-4 text-center text-sm text-muted-foreground">Aucune variante de tarif pour ce modèle.</TableCell></TableRow>;

  return variants.map(v => (
    <TableRow key={v.id} className="bg-muted/30">
      <TableCell className="pl-10 text-sm">
        <span className="font-mono text-xs">{v.resolution} · {v.duration_seconds}s · {v.input_class}</span>
        {v.variant_key && <span className="ml-1 text-xs text-muted-foreground">({v.variant_key})</span>}
      </TableCell>
      <TableCell />
      <TableCell className="text-sm">
        <span className="font-medium">{v.user_token_cost} tokens</span>
        <span className="ml-1 text-xs text-muted-foreground">({Number(v.provider_cost_usd).toFixed(3)} $ coût fournisseur)</span>
      </TableCell>
      <TableCell className="text-right">
        <Switch
          checked={!!v.is_active}
          disabled={toggleVariant.isPending}
          onCheckedChange={next => toggleVariant.mutate({ id: v.id, active: next })}
          aria-label={`Activer ou désactiver ${v.resolution} ${v.duration_seconds}s ${v.input_class}`}
        />
      </TableCell>
    </TableRow>
  ));
}

export default function AdminModelsTab() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: models = [], isLoading, error } = useQuery({
    queryKey: ['admin-models'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_models');
      if (error) throw error;
      return data || [];
    },
  });

  // Construite depuis les données réelles (pas figée en dur) : couvre
  // automatiquement tout nouveau fournisseur ajouté au catalogue sans avoir
  // à retoucher ce fichier.
  const providerOptions = useMemo(() => {
    const values = [...new Set(models.map(m => m.provider).filter(Boolean))].sort();
    return [['all', 'Tous les fournisseurs'], ...values.map(p => [p, p])];
  }, [models]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return models.filter(m => {
      if (term && !m.label.toLowerCase().includes(term) && !m.key.toLowerCase().includes(term)) return false;
      if (typeFilter !== 'all') {
        if (typeFilter === 'image' || typeFilter === 'video') { if (m.kind !== typeFilter) return false; }
        else if (m.kind !== 'video' || m.tier !== typeFilter) return false;
      }
      if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
      if (statusFilter === 'active' && !m.is_active) return false;
      if (statusFilter === 'inactive' && m.is_active) return false;
      return true;
    });
  }, [models, search, typeFilter, providerFilter, statusFilter]);

  const grouped = useMemo(() => {
    const byKind = { image: [], video: [] };
    filtered.forEach(m => { (byKind[m.kind] || (byKind[m.kind] = [])).push(m); });
    return byKind;
  }, [filtered]);

  const toggle = useMutation({
    mutationFn: async ({ key, active }) => {
      const { data, error } = await supabase.rpc('admin_set_model_active', { p_key: key, p_active: active });
      if (error) throw error;
      return { key, active: !!data };
    },
    onMutate: async ({ key, active }) => {
      await qc.cancelQueries({ queryKey: ['admin-models'] });
      const previous = qc.getQueryData(['admin-models']);
      qc.setQueryData(['admin-models'], old => (old || []).map(m => (m.key === key ? { ...m, is_active: active, rate_active: m.rate_table ? active : m.rate_active } : m)));
      return { previous };
    },
    onError: (error, _vars, context) => { if (context?.previous) qc.setQueryData(['admin-models'], context.previous); toast.error(error?.message || 'Échec de la mise à jour'); },
    onSuccess: ({ key, active }) => { toast.success(`${key} ${active ? 'activé' : 'désactivé'}`); qc.invalidateQueries({ queryKey: ['admin-video-variants', key] }); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin-models'] }),
  });

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Chargement des modèles…</div>;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  const renderTable = rows => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Modèle</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Tarif — comment c'est calculé</TableHead>
          <TableHead className="text-right">Actif</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!rows.length && (
          <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Aucun modèle ne correspond à la recherche/aux filtres.</TableCell></TableRow>
        )}
        {rows.map(m => {
          const desynced = m.rate_table && m.is_active !== m.rate_active;
          const hasVariants = m.pricing_display?.kind === 'per_variant';
          const isOpen = !!expanded[m.key];
          return (
            <React.Fragment key={m.key}>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {hasVariants && (
                      <button type="button" onClick={() => setExpanded(prev => ({ ...prev, [m.key]: !prev[m.key] }))} aria-label={isOpen ? 'Réduire les variantes' : 'Voir les variantes (résolution/durée)'} className="text-muted-foreground hover:text-foreground">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                    <div>
                      <p className="font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.key}</p>
                      <VerificationBadge schemaVerified={m.schema_verified} schemaVerifiedAt={m.schema_verified_at} pricingVerifiedAt={m.pricing_verified_at} pricingSourceUrl={m.pricing_source_url} />
                      {desynced && (
                        <span className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                          <TriangleAlert className="h-3.5 w-3.5" />
                          Désynchronisé ({m.rate_table} : {m.rate_active ? 'actif' : 'inactif'})
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{tierBadge(m.kind, m.tier)}</TableCell>
                <TableCell><PricingCell pricing={m.pricing_display} /></TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={!!m.is_active}
                    disabled={toggle.isPending}
                    onCheckedChange={next => toggle.mutate({ key: m.key, active: next })}
                    aria-label={`Activer ou désactiver ${m.label}`}
                  />
                </TableCell>
              </TableRow>
              {hasVariants && isOpen && <VariantRows modelKey={m.key} />}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un modèle (nom ou clé)…" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPE_FILTER_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{providerOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Désactivés</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} / {models.length} modèle{models.length > 1 ? 's' : ''}</span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Modèles vidéo</CardTitle>
          <CardDescription>
            <span className="block">Vidéo standard, avatar, lipsync, motion control — un modèle activé ici devient immédiatement choisissable côté utilisateur (Studio IA / Studio UGC).</span>
            <span className="mt-2 block rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground">
              <strong>3 façons d'être facturé, selon le badge de type :</strong><br/>
              <span className="font-medium">Avatar / Lipsync / Motion control</span> → prix à la seconde de vidéo produite (ex. "9 tokens/seconde, jusqu'à 35s").<br/>
              <span className="font-medium">Vidéo standard / premium</span> → prix qui dépend de la résolution et de la durée choisies — déplie la ligne (flèche) pour voir/activer chaque combinaison séparément.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>{renderTable(grouped.video || [])}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Modèles image</CardTitle>
          <CardDescription>
            <span className="block">Pas de table de tarif séparée — seul le switch ci-dessous compte pour activer/désactiver le modèle entier.</span>
            <span className="mt-2 block rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground">
              <strong>Facturation par résolution</strong> : le prix affiché (ex. "1K : 3t · 2K : 4t · 4K : 6t") dépend de la résolution que l'utilisateur choisit au moment de générer — impossible aujourd'hui d'activer une résolution et pas une autre (pas de table dédiée comme pour la vidéo).
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>{renderTable(grouped.image || [])}</CardContent>
      </Card>
    </div>
  );
}
