import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Coins, Gift, Loader2, PlusCircle, Search, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';

const SOURCE_LABEL = { permanent: 'Packs / permanents', subscription: 'Abonnement', promotion: 'Promotion', reward: 'Récompenses' };
const ACTION_LABEL = { image_generation: 'Images', video_generation: 'Vidéos', ai_chat_generation: 'Texte / assistant IA', tts_generation: 'Voix TTS', voice_preview: 'Aperçu voix', music_generation: 'Musique' };
// Doit rester synchrone avec la contrainte vérifiée dans admin_grant_tokens()
// (20260816000005_admin_manual_token_grants.sql).
const ACTION_OPTIONS = [
  ['image_generation', 'Images'], ['video_generation', 'Vidéos'], ['ai_chat_generation', 'Chat IA'],
  ['tts_generation', 'Voix (TTS)'], ['voice_preview', 'Aperçu voix'], ['music_generation', 'Musique'],
  ['dubbing_generation', 'Doublage'], ['voice_conversion_generation', 'Clonage vocal'],
  ['transcription_generation', 'Transcription'], ['sound_effect_generation', 'Effets sonores'],
];
const EMPTY_GRANT_FORM = { amount: '10', allowedActions: ['image_generation'], expiresAt: '', reason: '' };
const n = (value) => Number(value || 0).toLocaleString('fr-FR');
const dateTime = (value) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function defaultExpiry(days = 7) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pad = (v) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Metric({ icon: Icon, label, value, description }) {
  return <Card><CardContent className="p-5 flex justify-between gap-3"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{n(value)}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><div className="rounded-md bg-primary/10 p-2 text-primary h-fit"><Icon className="h-4 w-4" /></div></CardContent></Card>;
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

export default function AdminTokensTab({ dateFilter }) {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [grantUser, setGrantUser] = useState(null); // ligne admin_token_users en cours de dotation, ou null
  const [grantForm, setGrantForm] = useState(EMPTY_GRANT_FORM);

  async function load() {
    setLoading(true); setError('');
    const [summaryResult, usersResult] = await Promise.all([
      supabase.rpc('admin_token_dashboard', adminDateRangeToRpc(dateFilter)),
      supabase.rpc('admin_token_users', { p_search: search || null, p_source: source, p_limit: 100, p_offset: 0 }),
    ]);
    if (summaryResult.error || usersResult.error) setError((summaryResult.error || usersResult.error).message);
    setDashboard(summaryResult.data || null);
    setUsers(usersResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => { if (!cancelled) await load(); }, search ? 250 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, search, source]);

  function openGrant(row) {
    setGrantUser(row);
    setGrantForm({ ...EMPTY_GRANT_FORM, expiresAt: defaultExpiry(7) });
  }

  function updateGrant(key, value) {
    setGrantForm((current) => ({ ...current, [key]: value }));
  }

  async function submitGrant() {
    if (!grantUser) return;
    if (!grantForm.allowedActions.length) { toast.error('Choisis au moins une fonction autorisée.'); return; }
    if (!grantForm.expiresAt) { toast.error("Une date d'expiration est obligatoire."); return; }
    if (!grantForm.reason.trim()) { toast.error('Le motif est obligatoire (traçabilité).'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('admin_grant_tokens', {
      p_user_id: grantUser.user_id,
      p_amount: Number(grantForm.amount || 0),
      p_allowed_actions: grantForm.allowedActions,
      p_expires_at: new Date(grantForm.expiresAt).toISOString(),
      p_reason: grantForm.reason.trim(),
    });
    setSaving(false);
    if (error) { toast.error(`Ajout impossible : ${error.message}`); return; }
    toast.success(`${grantForm.amount} tokens ajoutés à ${grantUser.full_name || grantUser.email}.`);
    setGrantUser(null);
    setGrantForm(EMPTY_GRANT_FORM);
    await load();
  }

  const current = dashboard?.current || {};
  const total = Number(current.permanent || 0) + Number(current.subscription || 0) + Number(current.promotional || 0) + Number(current.rewards || 0);
  const sortable = useMemo(() => users.map((row) => ({ ...row, display_user: row.full_name || row.email })), [users]);
  const { sortedRows, sort, toggleSort } = useAdminTableSort(sortable, 'total_tokens', 'desc');

  return <div className="space-y-4">
    <div><h2 className="text-xl font-semibold flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /> Tokens</h2><p className="text-sm text-muted-foreground">Soldes actuels et mouvements sur : {dateFilter?.label || '7 derniers jours'}</p></div>
    {error && <Card className="border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Données indisponibles : {error}. La migration locale 20260811000023 doit être appliquée par le propriétaire.</CardContent></Card>}
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5"><Metric icon={Coins} label="Total disponible" value={total} description="4 sources visibles" /><Metric icon={WalletCards} label="Packs / permanents" value={current.permanent} description="Sans expiration" /><Metric icon={Clock} label="Abonnements" value={current.subscription} description="Cycle en cours" /><Metric icon={Gift} label="Promotionnels" value={current.promotional} description="Lots actifs" /><Metric icon={Gift} label="Récompenses" value={current.rewards} description="Lots actifs" /></div>

    <Card><CardHeader><div className="flex items-start justify-between gap-3 flex-wrap"><div><CardTitle className="text-base">Portefeuilles par utilisateur</CardTitle><CardDescription>Le total additionne les quatre soldes utilisables affichés dans l’application.</CardDescription></div><div className="flex gap-2 flex-wrap"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8 w-60" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom ou email…" /></div><Select value={source} onValueChange={setSource}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les sources</SelectItem><SelectItem value="permanent">Packs / permanents</SelectItem><SelectItem value="subscription">Abonnement</SelectItem><SelectItem value="promotion">Promotion</SelectItem><SelectItem value="reward">Récompenses</SelectItem></SelectContent></Select>{loading && <Loader2 className="h-4 w-4 animate-spin self-center" />}</div></div></CardHeader><CardContent className="p-0 overflow-x-auto"><Table><TableHeader><TableRow>{[['Utilisateur','display_user'],['Formule','plan'],['Permanents','permanent_tokens'],['Abonnement','subscription_tokens'],['Promo','promotional_tokens'],['Récompenses','reward_tokens'],['Total','total_tokens'],['Lots actifs','active_lots'],['Prochaine expiration','next_expiration']].map(([label,key], index) => <TableHead key={key} className={index >= 2 && index <= 7 ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} align={index >= 2 && index <= 7 ? 'right' : 'left'} /></TableHead>)}<TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{sortedRows.map((row) => <TableRow key={row.user_id}><TableCell><p className="font-medium">{row.full_name || '—'}</p><p className="text-xs text-muted-foreground">{row.email}</p></TableCell><TableCell>{row.plan || 'free'}</TableCell><TableCell className="text-right tabular-nums">{n(row.permanent_tokens)}</TableCell><TableCell className="text-right tabular-nums">{n(row.subscription_tokens)}</TableCell><TableCell className="text-right tabular-nums">{n(row.promotional_tokens)}</TableCell><TableCell className="text-right tabular-nums">{n(row.reward_tokens)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{n(row.total_tokens)}</TableCell><TableCell className="text-right tabular-nums">{n(row.active_lots)}</TableCell><TableCell>{dateTime(row.next_expiration)}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openGrant(row)}><PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tokens</Button></TableCell></TableRow>)}{!loading && !sortedRows.length && <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">Aucun portefeuille trouvé.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>

    <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Mouvements par source</CardTitle><CardDescription>Débits, remboursements et consommation nette sur la période.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.movements_by_source || []).map((row) => <div key={row.source_type} className="flex items-center justify-between gap-3 border-b py-2 last:border-0"><span>{SOURCE_LABEL[row.source_type] || row.source_type}</span><span className="text-sm tabular-nums text-right"><strong>{n(row.net)}</strong> nets · {n(row.debited)} débités · {n(row.refunded)} remboursés</span></div>)}{!dashboard?.movements_by_source?.length && <p className="text-sm text-muted-foreground">Aucun mouvement sur cette période.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Consommation par usage</CardTitle><CardDescription>Ce que les tokens ont réellement financé sur la période.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.movements_by_action || []).map((row) => <div key={row.action} className="flex items-center justify-between gap-3 border-b py-2 last:border-0"><span>{ACTION_LABEL[row.action] || row.action}</span><span className="text-sm tabular-nums text-right"><strong>{n(row.net)}</strong> nets · {n(row.refunded)} remboursés</span></div>)}{!dashboard?.movements_by_action?.length && <p className="text-sm text-muted-foreground">Aucune consommation sur cette période.</p>}</CardContent></Card></div>

    <Card><CardHeader><CardTitle className="text-base">Lots temporaires à surveiller</CardTitle><CardDescription>{n(current.expiring_7d)} tokens expirent dans les 7 prochains jours · {n(current.expired_unused)} déjà expirés sans être utilisés.</CardDescription></CardHeader><CardContent className="p-0 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Source</TableHead><TableHead>Libellé</TableHead><TableHead className="text-right">Restants</TableHead><TableHead>Usages autorisés</TableHead><TableHead>Expiration</TableHead></TableRow></TableHeader><TableBody>{(dashboard?.expiring_lots || []).map((lot) => <TableRow key={lot.id}><TableCell>{lot.email}</TableCell><TableCell>{SOURCE_LABEL[lot.source_type] || lot.source_type}</TableCell><TableCell>{lot.label || '—'}</TableCell><TableCell className="text-right tabular-nums">{n(lot.tokens_remaining)}</TableCell><TableCell className="max-w-72 text-xs">{(lot.allowed_actions || []).map((a) => ACTION_LABEL[a] || a).join(', ')}</TableCell><TableCell>{dateTime(lot.expires_at)}</TableCell></TableRow>)}{!dashboard?.expiring_lots?.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Aucun lot temporaire actif.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    <p className="text-xs text-muted-foreground">Le filtre de période agit sur les mouvements. Les soldes sont un instantané actuel. Le budget technique First Story reste séparé dans Tracking.</p>

    {/* Dotation manuelle — admin_grant_tokens (SECURITY DEFINER, garde is_admin() interne).
        Catégorie "Récompense" toujours, expiration et motif obligatoires (décision produit
        du 2026-08-16) : traçable dans token_transactions ET admin_audit_logs. */}
    <Dialog open={!!grantUser} onOpenChange={(open) => { if (!saving && !open) { setGrantUser(null); setGrantForm(EMPTY_GRANT_FORM); } }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Ajouter des tokens à {grantUser?.full_name || grantUser?.email}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Montant *"><Input type="number" min="1" value={grantForm.amount} onChange={(e) => updateGrant('amount', e.target.value)} /></Field>
          <Field label="Expire le *"><Input type="datetime-local" value={grantForm.expiresAt} onChange={(e) => updateGrant('expiresAt', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Motif *"><Input value={grantForm.reason} onChange={(e) => updateGrant('reason', e.target.value)} placeholder="Ex. Geste commercial suite au ticket #124" /></Field></div>
          <div className="sm:col-span-2"><Field label="Fonctions autorisées *"><ActionsPicker value={grantForm.allowedActions} onChange={(v) => updateGrant('allowedActions', v)} /></Field></div>
        </div>
        <p className="text-xs text-muted-foreground">Catégorisé comme « Récompense » : c'est la première source consommée par l'utilisateur, avant les tokens promo, l'abonnement et les packs permanents.</p>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => setGrantUser(null)}>Annuler</Button>
          <Button disabled={saving || !grantForm.amount} onClick={submitGrant}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ajouter les tokens</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
