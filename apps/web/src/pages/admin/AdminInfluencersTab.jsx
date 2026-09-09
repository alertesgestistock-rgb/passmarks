import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, Eye, Loader2, MousePointerClick, Plus, UserRoundCheck, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';

const STATUS_STYLES = {
  candidate: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  contacted: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  negotiating: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  trial: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  paused: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  ended: 'border-muted bg-muted text-muted-foreground',
  suspended: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
  blacklisted: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
};

const STATUS_LABELS = {
  candidate: 'Candidat', contacted: 'Contacté', negotiating: 'Négociation', trial: 'Essai',
  active: 'Actif', paused: 'En pause', ended: 'Terminé', suspended: 'Suspendu', blacklisted: 'Blacklisté',
};

const EMPTY_FORM = {
  userId: '', displayName: '', handle: '', email: '', phone: '', country: '', status: 'candidate',
  tier: 'creator', platforms: '', followers: '', commissionRate: '0', fixedFeeXaf: '0',
  contractStartedAt: '', contractEndedAt: '', notes: '', reason: '',
};

function xaf(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

function compact(value) {
  return Number(value || 0).toLocaleString('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
}

function MetricCard({ icon: Icon, label, value, description }) {
  return <Card><CardContent className="p-5 flex items-start justify-between gap-3">
    <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
    <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
  </CardContent></Card>;
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

export default function AdminInfluencersTab({ dateFilter }) {
  const [influencers, setInfluencers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { sortedRows, sort, toggleSort } = useAdminTableSort(influencers, 'gross_revenue_period', 'desc');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);
    const [{ data, error: overviewError }, { data: userData, error: usersError }] = await Promise.all([
      supabase.rpc('admin_influencer_overview', { p_from, p_to }),
      supabase.rpc('admin_list_users', { p_search: null, p_plan: 'all', p_limit: 100, p_offset: 0 }),
    ]);
    if (overviewError || usersError) setError((overviewError || usersError).message);
    setInfluencers(data || []);
    if (!usersError) setUsers((userData || []).filter((user) => user.role === 'user'));
    setLoading(false);
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => influencers.reduce((acc, row) => ({
    profiles: acc.profiles + 1,
    active: acc.active + (row.status === 'active' ? 1 : 0),
    contents: acc.contents + Number(row.contents_published_period || 0),
    views: acc.views + Number(row.views_period || 0),
    clicks: acc.clicks + Number(row.tracked_clicks_period || row.platform_clicks_period || 0),
    revenue: acc.revenue + Number(row.gross_revenue_period || 0),
    commissions: acc.commissions + Number(row.commissions_period || 0),
  }), { profiles: 0, active: 0, contents: 0, views: 0, clicks: 0, revenue: 0, commissions: 0 }), [influencers]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseUser(userId) {
    const user = users.find((item) => item.id === userId);
    setForm((current) => ({
      ...current,
      userId,
      displayName: user?.full_name || current.displayName,
      email: user?.email || current.email,
    }));
  }

  async function createInfluencer() {
    if (!form.userId || !form.displayName.trim()) {
      toast.error('Choisis un utilisateur et renseigne son nom public.');
      return;
    }
    setSaving(true);
    const platforms = form.platforms.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    const followers = Number(form.followers || 0);
    const { error: rpcError } = await supabase.rpc('admin_upsert_influencer', {
      p_user_id: form.userId,
      p_display_name: form.displayName.trim(),
      p_handle: form.handle.trim() || null,
      p_email: form.email.trim() || null,
      p_phone: form.phone.trim() || null,
      p_country: form.country.trim() || null,
      p_status: form.status,
      p_tier: form.tier || null,
      p_platforms: platforms,
      p_audience_snapshot: followers > 0 ? { followers } : {},
      p_commission_rate: Number(form.commissionRate || 0),
      p_fixed_fee_xaf: Number(form.fixedFeeXaf || 0),
      p_contract_started_at: form.contractStartedAt || null,
      p_contract_ended_at: form.contractEndedAt || null,
      p_notes: form.notes.trim() || null,
      p_reason: form.reason.trim() || 'Création depuis le dashboard admin',
    });
    setSaving(false);
    if (rpcError) {
      toast.error(`Création impossible : ${rpcError.message}`);
      return;
    }
    toast.success('Le compte possède maintenant le rôle influenceur.');
    setDialogOpen(false);
    setForm(EMPTY_FORM);
    await load();
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Influenceurs & ambassadeurs</h2>{loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}</div>
        <p className="mt-1 text-sm text-muted-foreground">Comptes Raconty, contenus, attribution, commissions et paiements · {dateFilter?.label || 'Total'}</p>
      </div>
      <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nouvel influenceur</Button>
    </div>

    {error && <p className="text-sm text-destructive">Erreur de chargement : {error}</p>}

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
      <MetricCard icon={UsersRound} label="Profils" value={summary.profiles} description={`${summary.active} actifs`} />
      <MetricCard icon={UserRoundCheck} label="Contenus publiés" value={summary.contents} description={dateFilter?.label || 'Total'} />
      <MetricCard icon={Eye} label="Vues" value={compact(summary.views)} description="Métriques importées" />
      <MetricCard icon={MousePointerClick} label="Clics" value={compact(summary.clicks)} description="Liens tracés ou plateforme" />
      <MetricCard icon={BadgeDollarSign} label="CA attribué" value={xaf(summary.revenue)} description={dateFilter?.label || 'Total'} />
      <MetricCard icon={BadgeDollarSign} label="Commissions" value={xaf(summary.commissions)} description={dateFilter?.label || 'Total'} />
      <MetricCard icon={BadgeDollarSign} label="Marge avant IA" value={xaf(summary.revenue - summary.commissions)} description="CA − commissions" />
    </div>

    {!loading && influencers.length === 0 && !error && <Card><CardHeader>
      <CardTitle className="text-base flex items-center gap-2"><UserRoundCheck className="h-4 w-4 text-muted-foreground" /> Aucun influenceur enregistré <Badge variant="outline">Programme prêt</Badge></CardTitle>
      <CardDescription>Sélectionne un compte Raconty existant avec « Nouvel influenceur ». La RPC locale attribuera le rôle `influencer`, créera la fiche partenaire et écrira l'action dans `admin_audit_logs`.</CardDescription>
    </CardHeader></Card>}

    {influencers.length > 0 && <Card>
      <CardHeader><CardTitle className="text-base">Performance par influenceur</CardTitle><CardDescription>La liste reste complète ; les volumes financiers et contenus suivent la période globale.</CardDescription></CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground">
            {[
              ['Influenceur','display_name','left'],['Pays','country','left'],['Statut','status','left'],['Palier','tier','left'],
              ['Audience','audience_snapshot','right'],['Contenus','contents_published_period','right'],['Vues','views_period','right'],
              ['Clics','tracked_clicks_period','right'],['CA attribué','gross_revenue_period','right'],['Commission période','commissions_period','right'],
              ['À traiter','commissions_payable_total','right'],['Payé période','payouts_paid_period','right'],['Taux','commission_rate','right'],
            ].map(([label,key,align]) => <th key={key} className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''}`}><SortableTableHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} align={align} /></th>)}
          </tr></thead>
          <tbody>{sortedRows.map((row) => <tr key={row.id} className="border-b last:border-0">
            <td className="px-4 py-3"><div className="font-medium">{row.display_name}</div><div className="text-xs text-muted-foreground">{row.handle || row.account_email}</div></td>
            <td className="px-4 py-3 text-muted-foreground">{row.country || '—'}</td>
            <td className="px-4 py-3"><Badge variant="outline" className={STATUS_STYLES[row.status]}>{STATUS_LABELS[row.status] || row.status}</Badge></td>
            <td className="px-4 py-3">{row.tier || '—'}</td>
            <td className="px-4 py-3 text-right tabular-nums">{compact(row.audience_snapshot?.followers)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{row.contents_published_period}</td>
            <td className="px-4 py-3 text-right tabular-nums">{compact(row.views_period)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{compact(row.tracked_clicks_period || row.platform_clicks_period)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{xaf(row.gross_revenue_period)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{xaf(row.commissions_period)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{xaf(Number(row.commissions_pending_total || 0) + Number(row.commissions_payable_total || 0))}</td>
            <td className="px-4 py-3 text-right tabular-nums">{xaf(row.payouts_paid_period)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{row.commission_rate} %</td>
          </tr>)}</tbody>
        </table>
      </CardContent>
    </Card>}

    <p className="text-xs text-muted-foreground">Les commissions ne deviennent définitives qu'après paiement confirmé et fin de la fenêtre de remboursement. L'onglet n'invente aucune attribution : contenus, clics et ventes restent à zéro tant que leurs pipelines ne les alimentent pas.</p>

    <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open); }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Créer un influenceur depuis un compte Raconty</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Compte Raconty *"><Select value={form.userId} onValueChange={chooseUser}><SelectTrigger><SelectValue placeholder="Choisir un utilisateur" /></SelectTrigger><SelectContent>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.full_name || user.email} · {user.email}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Nom public *"><Input value={form.displayName} onChange={(event) => update('displayName', event.target.value)} /></Field>
          <Field label="Handle"><Input value={form.handle} onChange={(event) => update('handle', event.target.value)} placeholder="@createur" /></Field>
          <Field label="Email de contact"><Input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></Field>
          <Field label="Téléphone"><Input value={form.phone} onChange={(event) => update('phone', event.target.value)} /></Field>
          <Field label="Pays"><Input value={form.country} onChange={(event) => update('country', event.target.value)} /></Field>
          <Field label="Statut"><Select value={form.status} onValueChange={(value) => update('status', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Palier"><Select value={form.tier} onValueChange={(value) => update('tier', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="creator">Créateur</SelectItem><SelectItem value="partner">Partenaire</SelectItem><SelectItem value="ambassador">Ambassadeur</SelectItem></SelectContent></Select></Field>
          <Field label="Plateformes"><Input value={form.platforms} onChange={(event) => update('platforms', event.target.value)} placeholder="tiktok, youtube, instagram" /></Field>
          <Field label="Audience totale"><Input type="number" min="0" value={form.followers} onChange={(event) => update('followers', event.target.value)} /></Field>
          <Field label="Commission (%)"><Input type="number" min="0" max="100" step="0.1" value={form.commissionRate} onChange={(event) => update('commissionRate', event.target.value)} /></Field>
          <Field label="Frais fixe (FCFA)"><Input type="number" min="0" value={form.fixedFeeXaf} onChange={(event) => update('fixedFeeXaf', event.target.value)} /></Field>
          <Field label="Début du contrat"><Input type="date" value={form.contractStartedAt} onChange={(event) => update('contractStartedAt', event.target.value)} /></Field>
          <Field label="Fin du contrat"><Input type="date" value={form.contractEndedAt} onChange={(event) => update('contractEndedAt', event.target.value)} /></Field>
          <div className="md:col-span-2"><Field label="Notes internes"><Textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} /></Field></div>
          <div className="md:col-span-2"><Field label="Motif d'audit"><Input value={form.reason} onChange={(event) => update('reason', event.target.value)} placeholder="Ex. Contrat campagne lancement août 2026" /></Field></div>
        </div>
        <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Annuler</Button><Button disabled={saving || !form.userId || !form.displayName.trim()} onClick={createInfluencer}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Attribuer le rôle influenceur</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
