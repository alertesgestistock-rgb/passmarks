import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Gift, Loader2, Pencil, Plus, Ticket, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';

// Doit rester synchrone avec la contrainte promo_codes_allowed_actions_check
// (20260811000017_restricted_token_grants.sql) : la RPC admin_create/update
// rejette toute valeur hors de cette liste, donc pas la peine de proposer
// autre chose ici.
const ACTION_OPTIONS = [
  ['image_generation', 'Génération image'],
  ['video_generation', 'Génération vidéo'],
  ['ai_chat_generation', 'Chat IA'],
  ['tts_generation', 'Voix (TTS)'],
  ['voice_preview', 'Aperçu voix'],
  ['music_generation', 'Musique'],
  ['dubbing_generation', 'Doublage'],
  ['voice_conversion_generation', 'Clonage vocal'],
  ['transcription_generation', 'Transcription'],
  ['sound_effect_generation', 'Effets sonores'],
];

const EMPTY_FORM = {
  code: '', description: '', tokens: '20', maxUses: '500', unlimited: false,
  allowedActions: ['image_generation'], validityHours: '48', expiresAt: '',
};

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(iso, fallback = 'Sans limite') {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString('fr-FR');
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function statusOf(code) {
  if (!code.is_active) return { label: 'Inactif', className: 'border-transparent bg-muted text-muted-foreground' };
  if (code.max_uses && code.uses_count >= code.max_uses) return { label: 'Épuisé', className: 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400' };
  if (code.expires_at && new Date(code.expires_at) < new Date()) return { label: 'Expiré', className: 'border-transparent bg-muted text-muted-foreground' };
  return { label: 'Actif', className: 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
}

function MetricCard({ icon: Icon, label, value, description }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function ActionsPicker({ value, onChange }) {
  function toggle(action) {
    onChange(value.includes(action) ? value.filter((item) => item !== action) : [...value, action]);
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ACTION_OPTIONS.map(([action, label]) => (
        <label key={action} className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm cursor-pointer hover:border-primary/60">
          <input type="checkbox" className="accent-primary" checked={value.includes(action)} onChange={() => toggle(action)} />
          {label}
        </label>
      ))}
    </div>
  );
}

export default function AdminPromoTab({ dateFilter }) {
  const [codes, setCodes] = useState([]);
  const [referralCodes, setReferralCodes] = useState([]);
  const [restrictedMetrics, setRestrictedMetrics] = useState(null);
  const [promoPolicies, setPromoPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoError, setPromoError] = useState('');
  const [referralError, setReferralError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editCode, setEditCode] = useState(null); // ligne promo_codes en cours d'édition, ou null
  const [editForm, setEditForm] = useState(null);

  const sortableCodes = useMemo(() => {
    const policies = new Map(promoPolicies.map(policy => [policy.promo_code_id, policy]));
    return codes.map(code => ({ ...code, ...(policies.get(code.id) || {}), display_status: statusOf(code).label }));
  }, [codes, promoPolicies]);
  const { sortedRows: sortedCodes, sort, toggleSort } = useAdminTableSort(sortableCodes, 'uses_count', 'desc');
  const { sortedRows: sortedReferralCodes, sort: referralSort, toggleSort: toggleReferralSort } = useAdminTableSort(referralCodes, 'converted_total', 'desc');

  const referralSummary = useMemo(() => referralCodes.reduce((summary, row) => ({
    codes: summary.codes + 1,
    activeReferrers: summary.activeReferrers + (Number(row.referrals_period) > 0 ? 1 : 0),
    referrals: summary.referrals + Number(row.referrals_period || 0),
    conversions: summary.conversions + Number(row.conversions_period || 0),
    tokens: summary.tokens + Number(row.referrer_tokens_period || 0) + Number(row.referred_tokens_period || 0),
  }), { codes: 0, activeReferrers: 0, referrals: 0, conversions: 0, tokens: 0 }), [referralCodes]);

  async function load() {
    setLoading(true);
    setPromoError('');
    setReferralError('');
    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);
    const [promoResult, referralResult, restrictedResult, policiesResult] = await Promise.all([
      supabase.rpc('admin_promo_codes_overview', { p_from, p_to }),
      supabase.rpc('admin_referral_codes_overview', { p_from, p_to }),
      supabase.rpc('admin_restricted_token_metrics', { p_from, p_to }),
      supabase.rpc('admin_promo_token_policies'),
    ]);
    setCodes(promoResult.data || []);
    setReferralCodes(referralResult.data || []);
    setRestrictedMetrics(restrictedResult.data || null);
    setPromoPolicies(policiesResult.data || []);
    if (promoResult.error) setPromoError(promoResult.error.message);
    if (referralResult.error) setReferralError(referralResult.error.message);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => { await load(); if (cancelled) return; })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  function updateCreate(key, value) {
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  async function createCode() {
    const code = createForm.code.trim().toUpperCase();
    if (!code) { toast.error('Le code est obligatoire.'); return; }
    if (!createForm.allowedActions.length) { toast.error('Choisis au moins une fonction autorisée.'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('admin_create_promo_code', {
      p_code: code,
      p_description: createForm.description.trim() || null,
      p_tokens: Number(createForm.tokens || 0),
      p_max_uses: createForm.unlimited ? null : Number(createForm.maxUses || 0) || null,
      p_allowed_actions: createForm.allowedActions,
      p_grant_validity_hours: Number(createForm.validityHours || 48),
      p_expires_at: createForm.expiresAt ? new Date(createForm.expiresAt).toISOString() : null,
    });
    setSaving(false);
    if (error) { toast.error(`Création impossible : ${error.message}`); return; }
    toast.success(`Code ${code} créé.`);
    setCreateOpen(false);
    setCreateForm(EMPTY_FORM);
    await load();
  }

  function openEdit(code) {
    setEditCode(code);
    setEditForm({
      description: code.description || '',
      tokens: String(code.tokens),
      maxUses: code.max_uses != null ? String(code.max_uses) : '',
      unlimited: code.max_uses == null,
      allowedActions: code.allowed_actions || [],
      validityHours: String(code.grant_validity_hours || 48),
      expiresAt: toDatetimeLocalValue(code.expires_at),
      hasExpiry: !!code.expires_at,
      isActive: code.is_active,
    });
  }

  function updateEdit(key, value) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  async function saveEdit() {
    if (!editCode || !editForm) return;
    if (editForm.maxUses !== '' && !editForm.unlimited && Number(editForm.maxUses) < editCode.uses_count) {
      toast.error(`Le plafond ne peut pas descendre sous ${editCode.uses_count} (déjà utilisé).`);
      return;
    }
    if (!editForm.allowedActions.length) { toast.error('Choisis au moins une fonction autorisée.'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('admin_update_promo_code', {
      p_id: editCode.id,
      p_description: editForm.description.trim() || null,
      p_tokens: Number(editForm.tokens || 0) || null,
      p_max_uses: editForm.unlimited ? null : (Number(editForm.maxUses || 0) || null),
      p_clear_max_uses: editForm.unlimited,
      p_allowed_actions: editForm.allowedActions,
      p_grant_validity_hours: Number(editForm.validityHours || 0) || null,
      p_expires_at: editForm.hasExpiry && editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : null,
      p_clear_expires_at: !editForm.hasExpiry,
      p_is_active: editForm.isActive,
    });
    setSaving(false);
    if (error) { toast.error(`Modification impossible : ${error.message}`); return; }
    toast.success(`Code ${editCode.code} mis à jour.`);
    setEditCode(null);
    setEditForm(null);
    await load();
  }

  return (
    <Tabs defaultValue="admin" className="space-y-4">
      <TabsList className="grid w-full max-w-xl grid-cols-2">
        <TabsTrigger value="admin">Codes promo administrateur</TabsTrigger>
        <TabsTrigger value="users">Codes de parrainage utilisateurs</TabsTrigger>
      </TabsList>

      <TabsContent value="admin" className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <MetricCard icon={Gift} label="Accordés" value={restrictedMetrics?.summary?.granted_period ?? 0} description={dateFilter?.label || 'Total'} />
          <MetricCard icon={Ticket} label="Consommés" value={restrictedMetrics?.summary?.consumed_period ?? 0} description="Net des remboursements" />
          <MetricCard icon={Ticket} label="Promos actives" value={restrictedMetrics?.summary?.active_promotional ?? 0} description="Solde disponible" />
          <MetricCard icon={Gift} label="Récompenses actives" value={restrictedMetrics?.summary?.active_rewards ?? 0} description="Solde disponible" />
          <MetricCard icon={Clock} label="Expirés inutilisés" value={restrictedMetrics?.summary?.expired_unused ?? 0} description="Tokens non consommés" />
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /> Codes promo administrateur</CardTitle>
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>
                <CardDescription>{codes.length} code{codes.length > 1 ? 's' : ''} au total · tokens distribués sur : {dateFilter?.label || 'Total'}</CardDescription>
              </div>
              <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Créer un code</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {promoError && <p className="px-6 py-4 text-sm text-destructive">Erreur de chargement : {promoError}</p>}
            <Table>
              <TableHeader><TableRow>
                {[
                  ['Code','code','left'],['Description','description','left'],['Tokens / usage','tokens','right'],
                  ['Utilisations','uses_count','right'],['Tokens distribués (période)','tokens_granted_total','right'],
                  ['Validité du lot','grant_validity_hours','right'],['Fonctions autorisées','allowed_actions','left'],['Solde actif','active_grant_tokens','right'],
                  ['Expire le','expires_at','left'],['Statut','display_status','left'],
                ].map(([label,key,align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} align={align} /></TableHead>)}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sortedCodes.map((code) => {
                  const status = statusOf(code);
                  return <TableRow key={code.id}>
                    <TableCell className="font-mono font-medium">{code.code}</TableCell>
                    <TableCell className="text-muted-foreground">{code.description || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{code.tokens}</TableCell>
                    <TableCell className="text-right tabular-nums">{code.uses_count}{code.max_uses ? ` / ${code.max_uses}` : ''}</TableCell>
                    <TableCell className="text-right tabular-nums">{code.tokens_granted_total}</TableCell>
                    <TableCell className="text-right tabular-nums">{code.grant_validity_hours ? `${code.grant_validity_hours} h` : '—'}</TableCell>
                    <TableCell className="max-w-56 text-xs text-muted-foreground">{code.allowed_actions?.join(', ') || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{code.active_grant_tokens ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(code.expires_at)}</TableCell>
                    <TableCell><Badge className={status.className}>{status.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(code)} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>;
                })}
                {!loading && codes.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-10">Aucun code promo administrateur trouvé.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {!!restrictedMetrics?.by_action?.length && <Card>
          <CardHeader><CardTitle className="text-base">Consommation des lots par fonctionnalité</CardTitle><CardDescription>Permet de vérifier quelles récompenses servent réellement et confirme que la vidéo reste bloquée lorsqu’elle n’est pas autorisée.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{restrictedMetrics.by_action.map(row => <div key={row.action} className="rounded-lg border p-3"><p className="font-mono text-xs text-muted-foreground">{row.action}</p><p className="mt-1 text-lg font-semibold tabular-nums">{row.net} tokens</p><p className="text-xs text-muted-foreground">{row.debited} débités · {row.refunded} remboursés</p></div>)}</CardContent>
        </Card>}
        <p className="text-xs text-muted-foreground px-1">Le code lui-même n'est pas renommable une fois créé (traçabilité) : désactive-le et crée-en un nouveau si besoin. Toute création/modification est journalisée dans `admin_audit_logs`.</p>
      </TabsContent>

      <TabsContent value="users" className="space-y-4">
        {referralError && <p className="text-sm text-destructive">Erreur de chargement : {referralError}</p>}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard icon={Ticket} label="Codes créés" value={referralSummary.codes} description="Depuis toujours" />
          <MetricCard icon={Users} label="Parrains actifs" value={referralSummary.activeReferrers} description={dateFilter?.label || 'Total'} />
          <MetricCard icon={Users} label="Filleuls inscrits" value={referralSummary.referrals} description={dateFilter?.label || 'Total'} />
          <MetricCard icon={Gift} label="Conversions" value={referralSummary.conversions} description={dateFilter?.label || 'Total'} />
          <MetricCard icon={Gift} label="Tokens distribués" value={referralSummary.tokens} description="Parrains + filleuls" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Codes de parrainage utilisateurs</CardTitle>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            <CardDescription>Propriétaire, inscriptions, conversions et récompenses · métriques de période : {dateFilter?.label || 'Total'}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                {[
                  ['Code','code','left'],['Créateur','owner_name','left'],['Formule','owner_plan','left'],
                  ['Créé le','code_created_at','left'],['Filleuls période','referrals_period','right'],['Filleuls total','referrals_total','right'],
                  ['En attente','pending_total','right'],['Convertis période','conversions_period','right'],['Convertis total','converted_total','right'],
                  ['Conversion','conversion_rate','right'],['Tokens période','referrer_tokens_period','right'],['Tokens total','referrer_tokens_total','right'],
                  ['Plans convertis','converted_plans','left'],['Dernier filleul','last_referral_at','left'],['Dernière conversion','last_conversion_at','left'],
                ].map(([label,key,align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={referralSort} onSort={toggleReferralSort} align={align} /></TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {sortedReferralCodes.map((row) => <TableRow key={row.user_id}>
                  <TableCell className="font-mono font-medium">{row.code}</TableCell>
                  <TableCell><div className="font-medium">{row.owner_name || 'Sans nom'}</div><div className="text-xs text-muted-foreground">{row.owner_email}</div></TableCell>
                  <TableCell><Badge variant={row.owner_plan_status === 'active' ? 'default' : 'secondary'}>{row.owner_plan || 'free'}</Badge></TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(row.code_created_at, '—')}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.referrals_period}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.referrals_total}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.pending_total}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.conversions_period}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.converted_total}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(row.conversion_rate || 0).toLocaleString('fr-FR')} %</TableCell>
                  <TableCell className="text-right tabular-nums"><div>{Number(row.referrer_tokens_period || 0) + Number(row.referred_tokens_period || 0)}</div><div className="text-xs text-muted-foreground">{row.referrer_tokens_period} parrain · {row.referred_tokens_period} filleuls</div></TableCell>
                  <TableCell className="text-right tabular-nums"><div>{Number(row.referrer_tokens_total || 0) + Number(row.referred_tokens_total || 0)}</div><div className="text-xs text-muted-foreground">{row.referrer_tokens_total} parrain · {row.referred_tokens_total} filleuls</div></TableCell>
                  <TableCell className="text-muted-foreground">{Object.entries(row.converted_plans || {}).map(([plan, count]) => `${plan}: ${count}`).join(' · ') || '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateTime(row.last_referral_at)}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateTime(row.last_conversion_at)}</TableCell>
                </TableRow>)}
                {!loading && referralCodes.length === 0 && <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground py-10">Aucun code de parrainage utilisateur trouvé.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground px-1">« Filleuls période » suit la date d'inscription attribuée ; « Convertis période » et les tokens suivent la date de conversion. Les clics ne sont pas encore capturés par le système actuel.</p>
      </TabsContent>

      {/* Création — admin_create_promo_code (SECURITY DEFINER, garde is_admin() interne) */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!saving) { setCreateOpen(open); if (!open) setCreateForm(EMPTY_FORM); } }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Créer un code promo administrateur</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code *"><Input className="font-mono uppercase" value={createForm.code} onChange={(e) => updateCreate('code', e.target.value.toUpperCase())} placeholder="LANCEMENT2026" maxLength={32} /></Field>
            <Field label="Tokens par utilisation *"><Input type="number" min="1" value={createForm.tokens} onChange={(e) => updateCreate('tokens', e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Description"><Input value={createForm.description} onChange={(e) => updateCreate('description', e.target.value)} placeholder="Campagne de lancement Raconty" /></Field></div>
            <Field label="Nombre max d'utilisations">
              <div className="flex items-center gap-2">
                <Input type="number" min="1" disabled={createForm.unlimited} value={createForm.maxUses} onChange={(e) => updateCreate('maxUses', e.target.value)} />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><Switch checked={createForm.unlimited} onCheckedChange={(v) => updateCreate('unlimited', v)} /> Illimité</label>
              </div>
            </Field>
            <Field label="Validité du lot reçu (heures) *"><Input type="number" min="1" max="8760" value={createForm.validityHours} onChange={(e) => updateCreate('validityHours', e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Date d'expiration du code (optionnel)"><Input type="datetime-local" value={createForm.expiresAt} onChange={(e) => updateCreate('expiresAt', e.target.value)} /></Field></div>
            <div className="sm:col-span-2"><Field label="Fonctions autorisées *"><ActionsPicker value={createForm.allowedActions} onChange={(v) => updateCreate('allowedActions', v)} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button disabled={saving || !createForm.code.trim()} onClick={createCode}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer le code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Édition — admin_update_promo_code. Le code lui-même n'est pas renommable (traçabilité). */}
      <Dialog open={!!editCode} onOpenChange={(open) => { if (!saving && !open) { setEditCode(null); setEditForm(null); } }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier {editCode?.code}</DialogTitle></DialogHeader>
          {editForm && <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tokens par utilisation"><Input type="number" min="1" value={editForm.tokens} onChange={(e) => updateEdit('tokens', e.target.value)} /></Field>
            <Field label="Actif">
              <div className="flex h-9 items-center gap-2"><Switch checked={editForm.isActive} onCheckedChange={(v) => updateEdit('isActive', v)} /><span className="text-sm text-muted-foreground">{editForm.isActive ? 'Actif' : 'Inactif'}</span></div>
            </Field>
            <div className="sm:col-span-2"><Field label="Description"><Input value={editForm.description} onChange={(e) => updateEdit('description', e.target.value)} /></Field></div>
            <Field label={`Nombre max d'utilisations (déjà utilisé : ${editCode?.uses_count ?? 0})`}>
              <div className="flex items-center gap-2">
                <Input type="number" min={editCode?.uses_count ?? 0} disabled={editForm.unlimited} value={editForm.maxUses} onChange={(e) => updateEdit('maxUses', e.target.value)} />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><Switch checked={editForm.unlimited} onCheckedChange={(v) => updateEdit('unlimited', v)} /> Illimité</label>
              </div>
            </Field>
            <Field label="Validité du lot reçu (heures)"><Input type="number" min="1" max="8760" value={editForm.validityHours} onChange={(e) => updateEdit('validityHours', e.target.value)} /></Field>
            <Field label="Date d'expiration du code">
              <div className="flex items-center gap-2">
                <Input type="datetime-local" disabled={!editForm.hasExpiry} value={editForm.expiresAt} onChange={(e) => updateEdit('expiresAt', e.target.value)} />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><Switch checked={editForm.hasExpiry} onCheckedChange={(v) => updateEdit('hasExpiry', v)} /> Avec date</label>
              </div>
            </Field>
            <div className="sm:col-span-2"><Field label="Fonctions autorisées"><ActionsPicker value={editForm.allowedActions} onChange={(v) => updateEdit('allowedActions', v)} /></Field></div>
          </div>}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => { setEditCode(null); setEditForm(null); }}>Annuler</Button>
            <Button disabled={saving} onClick={saveEdit}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
