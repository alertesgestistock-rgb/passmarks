import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bot, CircleDollarSign, Gauge, Loader2, PlusCircle, ShieldCheck, Sparkles, Wand2, Wallet } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';

const PROVIDER_LABELS = { replicate: 'Replicate', openrouter: 'OpenRouter' };
const DIRECTOR_TASK_LABELS = { video_generator: 'Générateur vidéo', script_video: 'Éditeur de script — vidéo', ugc: 'Studio UGC' };

// Soldes fournisseurs — pas d'API publique de solde chez Replicate/OpenRouter
// (vérifié le 2026-08-19), donc l'admin déclare ses recharges manuellement ici
// et l'app calcule le solde restant = recharges - coûts déjà trackés par
// admin_ai_job_costs. Voir 20260819000005_provider_balance_tracking.sql.
function ProviderBalancesCard() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topupAmounts, setTopupAmounts] = useState({});
  const [thresholdDrafts, setThresholdDrafts] = useState({});
  const [correctionOpen, setCorrectionOpen] = useState({});
  const [correctionAmounts, setCorrectionAmounts] = useState({});
  const [correctionNotes, setCorrectionNotes] = useState({});
  const [busy, setBusy] = useState('');

  const load = () => {
    setLoading(true);
    supabase.rpc('admin_provider_balances').then(({ data, error }) => {
      if (error) { toast.error(error.message); setLoading(false); return; }
      setBalances(data || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const submitTopup = async (provider) => {
    const amount = Number(topupAmounts[provider]);
    if (!amount || amount <= 0) { toast.error('Montant invalide'); return; }
    setBusy(`topup-${provider}`);
    const { error } = await supabase.rpc('admin_topup_provider_balance', {
      p_provider: provider, p_amount_usd: amount, p_note: null,
    });
    setBusy('');
    if (error) { toast.error(error.message); return; }
    toast.success(`+$${amount} ajouté à ${PROVIDER_LABELS[provider]}`);
    setTopupAmounts((v) => ({ ...v, [provider]: '' }));
    load();
  };

  const submitCorrection = async (provider) => {
    const amount = correctionAmounts[provider];
    const note = (correctionNotes[provider] || '').trim();
    if (amount === undefined || amount === '' || Number.isNaN(Number(amount))) { toast.error('Montant invalide'); return; }
    if (!note) { toast.error('Une note est obligatoire pour justifier la correction'); return; }
    setBusy(`correction-${provider}`);
    const { error } = await supabase.rpc('admin_correct_provider_balance', {
      p_provider: provider, p_balance_usd: Number(amount), p_note: note,
    });
    setBusy('');
    if (error) { toast.error(error.message); return; }
    toast.success(`Solde ${PROVIDER_LABELS[provider]} recalé à $${Number(amount).toFixed(2)}`);
    setCorrectionAmounts((v) => ({ ...v, [provider]: '' }));
    setCorrectionNotes((v) => ({ ...v, [provider]: '' }));
    setCorrectionOpen((v) => ({ ...v, [provider]: false }));
    load();
  };

  const submitThreshold = async (provider) => {
    const threshold = Number(thresholdDrafts[provider]);
    if (threshold == null || threshold < 0 || Number.isNaN(threshold)) { toast.error('Seuil invalide'); return; }
    setBusy(`threshold-${provider}`);
    const { error } = await supabase.rpc('admin_set_provider_balance_threshold', {
      p_provider: provider, p_threshold_usd: threshold,
    });
    setBusy('');
    if (error) { toast.error(error.message); return; }
    toast.success(`Seuil ${PROVIDER_LABELS[provider]} mis à jour`);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-primary" /> Soldes fournisseurs (estimation)</CardTitle>
        <CardDescription>
          Replicate et OpenRouter n'exposent pas d'API de solde — déclare tes recharges ici, l'app soustrait les coûts déjà trackés.
          Alerte Telegram automatique dès qu'un solde estimé passe sous le seuil.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!loading && balances.map((row) => (
          <div key={row.provider} className={`rounded-lg border p-4 ${row.is_low ? 'border-destructive/40 bg-destructive/5' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{PROVIDER_LABELS[row.provider] || row.provider}</span>
              {row.is_low && <Badge variant="destructive">Solde bas</Badge>}
            </div>
            <p className="mt-1 text-2xl font-semibold">${Number(row.balance_usd).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {Number(row.total_credited_usd).toFixed(2)}$ rechargés − {Number(row.total_spent_usd).toFixed(2)}$ de coûts connus
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number" min="0" step="0.01" placeholder="Montant $"
                value={topupAmounts[row.provider] || ''}
                onChange={(e) => setTopupAmounts((v) => ({ ...v, [row.provider]: e.target.value }))}
                className="h-8"
              />
              <Button size="sm" variant="outline" disabled={busy === `topup-${row.provider}`} onClick={() => submitTopup(row.provider)}>
                {busy === `topup-${row.provider}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                Recharger
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0">Seuil d'alerte $</span>
              <Input
                type="number" min="0" step="0.5"
                defaultValue={row.min_threshold_usd}
                onChange={(e) => setThresholdDrafts((v) => ({ ...v, [row.provider]: e.target.value }))}
                className="h-7 w-20"
              />
              <Button size="sm" variant="ghost" className="h-7 px-2" disabled={busy === `threshold-${row.provider}`} onClick={() => submitThreshold(row.provider)}>
                {busy === `threshold-${row.provider}` ? <Loader2 className="h-3 w-3 animate-spin" /> : 'OK'}
              </Button>
            </div>
            <button
              type="button"
              className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => setCorrectionOpen((v) => ({ ...v, [row.provider]: !v[row.provider] }))}
            >
              {correctionOpen[row.provider] ? 'Annuler la correction' : 'Le solde affiché ne correspond pas au vrai solde ? Corriger'}
            </button>
            {correctionOpen[row.provider] && (
              <div className="mt-2 space-y-2 rounded-md border border-dashed p-2">
                <p className="text-xs text-muted-foreground">
                  Recale le solde estimé sur le vrai solde du dashboard {PROVIDER_LABELS[row.provider]} — n'efface pas l'historique des recharges, sert juste de nouveau point de départ pour le calcul.
                </p>
                <Input
                  type="number" step="0.01" placeholder="Vrai solde actuel $"
                  value={correctionAmounts[row.provider] || ''}
                  onChange={(e) => setCorrectionAmounts((v) => ({ ...v, [row.provider]: e.target.value }))}
                  className="h-8"
                />
                <Input
                  type="text" placeholder="Note obligatoire (pourquoi cette correction)"
                  value={correctionNotes[row.provider] || ''}
                  onChange={(e) => setCorrectionNotes((v) => ({ ...v, [row.provider]: e.target.value }))}
                  className="h-8"
                />
                <Button size="sm" variant="outline" disabled={busy === `correction-${row.provider}`} onClick={() => submitCorrection(row.provider)}>
                  {busy === `correction-${row.provider}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Recaler le solde
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Onglet IA & coûts — branché sur les vraies données (2026-08-09).
//
// Source : public.admin_ai_daily_costs_list(p_since) (migration 20260808000011),
// agrégats quotidiens réels par provider/modèle/type de job, gardés par
// is_admin(). Un coût inconnu (job non chiffré) reste NULL/absent, jamais
// converti en zéro — la couverture affichée (%) rend ça explicite.
// -----------------------------------------------------------------------------

const PIE_COLORS = ['hsl(var(--primary))', '#2563eb', '#94a3b8', '#f59e0b', '#16a34a'];
const chartConfig = { cost: { label: 'Coût IA connu (FCFA)', color: 'hsl(var(--primary))' } };
const fmt = new Intl.NumberFormat('fr-FR');

function formatXaf(n) {
  return `${fmt.format(Math.round(n))} FCFA`;
}

export default function AdminAiCostsTab({ dateFilter }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState('Tous');
  const [videoRows, setVideoRows] = useState([]);
  const [imageRows, setImageRows] = useState([]);
  const [promptDirectorRows, setPromptDirectorRows] = useState([]);
  const [promptDirectorError, setPromptDirectorError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);
    supabase.rpc('admin_ai_daily_costs_list', { p_since: p_from || '1970-01-01T00:00:00Z', p_until: p_to }).then(({ data, error: rpcError }) => {
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [dateFilter]);

  useEffect(() => {
    let cancelled = false;
    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);
    supabase.rpc('admin_image_economics_list', { p_since: p_from || '1970-01-01T00:00:00Z', p_until: p_to }).then(({ data, error: rpcError }) => {
      if (!cancelled) {
        if (rpcError && !rpcError.message?.includes('admin_image_economics_list')) setError(rpcError.message);
        setImageRows(data || []);
      }
    });
    return () => { cancelled = true; };
  }, [dateFilter]);

  useEffect(() => {
    let cancelled = false;
    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);
    supabase.rpc('admin_video_economics_list', { p_since: p_from || '1970-01-01T00:00:00Z', p_until: p_to }).then(({ data, error: rpcError }) => {
      if (!cancelled) {
        if (rpcError && !rpcError.message?.includes('admin_video_economics_list')) setError(rpcError.message);
        setVideoRows(data || []);
      }
    });
    return () => { cancelled = true; };
  }, [dateFilter]);

  // Ventilation dédiée du Prompt Director par director_task (video_generator /
  // script_video / ugc) — job_type='ai_chat' + settings.source='prompt_director',
  // voir admin_prompt_director_costs_list (20260820000002, non déployée).
  useEffect(() => {
    let cancelled = false;
    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);
    supabase.rpc('admin_prompt_director_costs_list', { p_since: p_from || '1970-01-01T00:00:00Z', p_until: p_to }).then(({ data, error: rpcError }) => {
      if (!cancelled) {
        setPromptDirectorError(rpcError?.message || '');
        setPromptDirectorRows(rpcError ? [] : (data || []));
      }
    });
    return () => { cancelled = true; };
  }, [dateFilter]);

  const providers = useMemo(() => ['Tous', ...new Set(rows.map((r) => r.provider).filter(Boolean))], [rows]);
  const filtered = useMemo(
    () => (provider === 'Tous' ? rows : rows.filter((r) => r.provider === provider)),
    [rows, provider],
  );

  const totals = useMemo(() => filtered.reduce((acc, r) => ({
    jobs: acc.jobs + (r.jobs_count || 0),
    succeeded: acc.succeeded + (r.succeeded_jobs_count || 0),
    uncosted: acc.uncosted + (r.uncosted_jobs_count || 0),
    costXaf: acc.costXaf + (r.known_cost_xaf_at_600 || 0),
    costUsd: acc.costUsd + (r.known_cost_usd || 0),
  }), { jobs: 0, succeeded: 0, uncosted: 0, costXaf: 0, costUsd: 0 }), [filtered]);

  const coveragePercent = totals.jobs > 0 ? (100 * (totals.jobs - totals.uncosted) / totals.jobs) : null;

  const dailyChart = useMemo(() => {
    const byDay = {};
    filtered.forEach((r) => {
      const key = r.day?.slice(0, 10);
      byDay[key] = (byDay[key] || 0) + (r.known_cost_xaf_at_600 || 0);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, cost]) => ({ day: day?.slice(5), cost: Math.round(cost) }));
  }, [filtered]);

  const byModel = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      const key = `${r.model_key || '—'}·${r.provider || '—'}`;
      if (!map[key]) {
        map[key] = { model: r.model_key || '—', provider: r.provider || '—', jobs: 0, succeeded: 0, uncosted: 0, costXaf: 0 };
      }
      map[key].jobs += r.jobs_count || 0;
      map[key].succeeded += r.succeeded_jobs_count || 0;
      map[key].uncosted += r.uncosted_jobs_count || 0;
      map[key].costXaf += r.known_cost_xaf_at_600 || 0;
    });
    return Object.values(map).sort((a, b) => b.costXaf - a.costXaf);
  }, [filtered]);

  const byProvider = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      const key = r.provider || '—';
      map[key] = (map[key] || 0) + (r.known_cost_xaf_at_600 || 0);
    });
    return Object.entries(map)
      .filter(([, value]) => value > 0)
      .map(([name, value], i) => ({ name, value: Math.round(value), fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [filtered]);
  const { sortedRows: sortedModels, sort: modelSort, toggleSort: toggleModelSort } = useAdminTableSort(byModel, 'costXaf', 'desc');
  const videoEconomics = useMemo(() => videoRows.map(row => {
    const tokens = Number(row.tokens || 0); const netTokens = Math.max(0, tokens - Number(row.refunded_tokens || 0)); const costUsd = Number(row.actual_cost_usd || row.estimated_cost_usd || 0);
    const netRevenueXaf = netTokens * 21.25; const costXaf = costUsd * 600; const marginXaf = netRevenueXaf - costXaf;
    return { ...row, tokens, netTokens, costUsd, costXaf, netRevenueXaf, marginXaf, marginPercent: netRevenueXaf > 0 ? 100 * marginXaf / netRevenueXaf : null };
  }), [videoRows]);
  const promptDirectorByTask = useMemo(() => {
    const map = {};
    promptDirectorRows.forEach(row => {
      const key = row.director_task || 'unknown';
      if (!map[key]) map[key] = { task: key, jobs: 0, succeeded: 0, failed: 0, uncosted: 0, tokensCharged: 0, refundedTokens: 0, costXaf: 0, costUsd: 0 };
      map[key].jobs += Number(row.jobs_count || 0);
      map[key].succeeded += Number(row.succeeded_jobs_count || 0);
      map[key].failed += Number(row.failed_jobs_count || 0);
      map[key].uncosted += Number(row.uncosted_jobs_count || 0);
      map[key].tokensCharged += Number(row.tokens_charged || 0);
      map[key].refundedTokens += Number(row.refunded_tokens || 0);
      map[key].costXaf += Number(row.known_cost_xaf_at_600 || 0);
      map[key].costUsd += Number(row.known_cost_usd || 0);
    });
    return ['video_generator', 'script_video', 'ugc'].map(task => map[task] || { task, jobs: 0, succeeded: 0, failed: 0, uncosted: 0, tokensCharged: 0, refundedTokens: 0, costXaf: 0, costUsd: 0 });
  }, [promptDirectorRows]);
  const promptDirectorTotalJobs = promptDirectorByTask.reduce((sum, row) => sum + row.jobs, 0);
  const imageEconomics = useMemo(() => imageRows.map(row => {
    const tokens = Number(row.tokens || 0); const netTokens = Math.max(0, tokens - Number(row.refunded_tokens || 0)); const costUsd = Number(row.actual_cost_usd || row.estimated_cost_usd || 0);
    const netRevenueXaf = netTokens * 21.25; const costXaf = costUsd * 600; const marginXaf = netRevenueXaf - costXaf;
    return { ...row, tokens, netTokens, costUsd, costXaf, netRevenueXaf, marginXaf, marginPercent: netRevenueXaf > 0 ? 100 * marginXaf / netRevenueXaf : null };
  }), [imageRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">IA & coûts</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Fournisseurs et coûts réels · taux fixe : 1 USD = 600 FCFA{dateFilter?.label ? ` · ${dateFilter.label}` : ''}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Erreur de chargement : {error}</p>}

      <ProviderBalancesCard />

      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm w-fit">
        {providers.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setProvider(item)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${provider === item ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div>
              <p className="text-xs text-muted-foreground">Coût IA connu ({dateFilter?.label || '30 derniers jours'})</p>
              <p className="mt-1 text-xl font-semibold">{formatXaf(totals.costXaf)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{totals.costUsd.toFixed(2)} USD × 600</p>
            </div>
            <div className="rounded-md bg-primary/10 p-2 text-primary"><CircleDollarSign className="h-4 w-4" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div>
              <p className="text-xs text-muted-foreground">Générations</p>
              <p className="mt-1 text-xl font-semibold">{fmt.format(totals.jobs)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{fmt.format(totals.succeeded)} terminées</p>
            </div>
            <div className="rounded-md bg-primary/10 p-2 text-primary"><Sparkles className="h-4 w-4" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div>
              <p className="text-xs text-muted-foreground">Couverture des coûts</p>
              <p className="mt-1 text-xl font-semibold">{coveragePercent != null ? `${coveragePercent.toFixed(1)} %` : '—'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{fmt.format(totals.uncosted)} jobs non chiffrés</p>
            </div>
            <div className="rounded-md bg-primary/10 p-2 text-primary"><ShieldCheck className="h-4 w-4" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div>
              <p className="text-xs text-muted-foreground">Coût moyen / job chiffré</p>
              <p className="mt-1 text-xl font-semibold">
                {totals.jobs - totals.uncosted > 0 ? formatXaf(totals.costXaf / (totals.jobs - totals.uncosted)) : '—'}
              </p>
            </div>
            <div className="rounded-md bg-primary/10 p-2 text-primary"><Gauge className="h-4 w-4" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dépense IA quotidienne</CardTitle>
            <CardDescription>Coût connu uniquement (jobs non chiffrés exclus) · {dateFilter?.label || '30 derniers jours'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <AreaChart data={dailyChart}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="cost" type="monotone" fill="var(--color-cost)" fillOpacity={0.15} stroke="var(--color-cost)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" /> Qualité financière</CardTitle>
            <CardDescription>Ce qui empêche une marge exacte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex justify-between gap-2"><span>Jobs sans coût fiable</span><strong>{fmt.format(totals.uncosted)}</strong></div>
              <p className="mt-1 text-xs text-muted-foreground">Généralement vidéo/audio, pas encore rapprochés.</p>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span>Niveau du total</span>
              <Badge variant="outline" className={coveragePercent >= 90 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'}>
                {coveragePercent == null ? 'Inconnu' : coveragePercent >= 90 ? 'Fiable' : 'Incomplet'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Économie des générations d’images asynchrones</CardTitle>
          <CardDescription>Chaque scène et variante est suivie séparément, y compris les échecs et remboursements.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2">Modèle</th><th className="pb-2">Statut</th><th className="pb-2 text-right">Images</th><th className="pb-2 text-right">Tokens</th><th className="pb-2 text-right">Revenu net prudent</th><th className="pb-2 text-right">Coût fournisseur</th><th className="pb-2 text-right">Marge</th><th className="pb-2 text-right">Remboursées</th></tr></thead>
            <tbody>{imageEconomics.map(row => <tr key={`${row.model_key}-${row.status}`} className="border-b last:border-0"><td className="py-3 font-medium">{row.model_key}</td><td className="py-3">{row.status}</td><td className="py-3 text-right">{fmt.format(row.operations)}</td><td className="py-3 text-right">{fmt.format(row.netTokens)}</td><td className="py-3 text-right">{formatXaf(row.netRevenueXaf)}</td><td className="py-3 text-right">{formatXaf(row.costXaf)}</td><td className={`py-3 text-right ${row.marginXaf < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{formatXaf(row.marginXaf)}{row.marginPercent != null ? ` (${row.marginPercent.toFixed(1)} %)` : ''}</td><td className="py-3 text-right">{fmt.format(row.refunded_operations || 0)}</td></tr>)}{imageEconomics.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Aucune opération image asynchrone sur cette période.</td></tr>}</tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Économie des générations vidéo</CardTitle>
          <CardDescription>Revenu net prudent : 21,25 FCFA par token · coût fournisseur converti à 600 FCFA/USD.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2">Modèle</th><th className="pb-2">Statut</th><th className="pb-2 text-right">Clips</th><th className="pb-2 text-right">Tokens</th><th className="pb-2 text-right">Revenu net prudent</th><th className="pb-2 text-right">Coût fournisseur</th><th className="pb-2 text-right">Marge</th><th className="pb-2 text-right">Remboursés</th></tr></thead>
            <tbody>{videoEconomics.map(row => <tr key={`${row.model_key}-${row.status}`} className="border-b last:border-0"><td className="py-3 font-medium">{row.model_key}</td><td className="py-3">{row.status}</td><td className="py-3 text-right">{fmt.format(row.operations)}</td><td className="py-3 text-right">{fmt.format(row.netTokens)}</td><td className="py-3 text-right">{formatXaf(row.netRevenueXaf)}</td><td className="py-3 text-right">{formatXaf(row.costXaf)}</td><td className={`py-3 text-right ${row.marginXaf < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{formatXaf(row.marginXaf)}{row.marginPercent != null ? ` (${row.marginPercent.toFixed(1)} %)` : ''}</td><td className="py-3 text-right">{fmt.format(row.refunded_operations || 0)}</td></tr>)}{videoEconomics.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Aucune opération vidéo Replicate sur cette période.</td></tr>}</tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance par modèle</CardTitle>
          <CardDescription>Un montant inconnu reste inconnu : il ne vaut jamais zéro.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                {[['Modèle','model'], ['Fournisseur','provider'], ['Jobs','jobs'], ['Terminés','succeeded'], ['Non chiffrés','uncosted'], ['Coût connu','costXaf']].map(([label, key], index) => (
                  <th key={key} className={`pb-2 pr-4 ${index >= 2 ? 'text-right' : ''}`}><SortableTableHeader label={label} sortKey={key} sort={modelSort} onSort={toggleModelSort} align={index >= 2 ? 'right' : 'left'} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((row) => (
                <tr key={`${row.model}-${row.provider}`} className="border-b last:border-0">
                  <td className="py-4 pr-4 font-medium">{row.model}</td>
                  <td className="py-4 pr-4 text-muted-foreground">{row.provider}</td>
                  <td className="py-4 pr-4 text-right">{fmt.format(row.jobs)}</td>
                  <td className="py-4 pr-4 text-right">{fmt.format(row.succeeded)}</td>
                  <td className="py-4 pr-4 text-right">{fmt.format(row.uncosted)}</td>
                  <td className="py-4 pr-4 text-right">{row.costXaf > 0 ? formatXaf(row.costXaf) : '—'}</td>
                </tr>
              ))}
              {!loading && byModel.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-10">Aucune génération sur cette période.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Wand2 className="h-4 w-4 text-primary" /> Prompt Director — ventilation par tâche</CardTitle>
          <CardDescription>
            Jobs job_type=&apos;ai_chat&apos; issus de l&apos;Assistant de réalisation (settings.source=&apos;prompt_director&apos;), débités via l&apos;action ai_chat_generation — ventilés par director_task.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {promptDirectorError && <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><p className="font-medium">Impossible de charger les statistiques Prompt Director.</p><p className="mt-1 text-xs">Vérifie que la migration de traçabilité est installée, puis recharge cette page.</p></div>}
          <table className="w-full min-w-[700px] text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2">Tâche</th><th className="pb-2 text-right">Jobs</th><th className="pb-2 text-right">Terminés</th><th className="pb-2 text-right">Échoués</th><th className="pb-2 text-right">Non chiffrés</th><th className="pb-2 text-right">Tokens facturés</th><th className="pb-2 text-right">Tokens remboursés</th><th className="pb-2 text-right">Coût connu</th></tr></thead>
            <tbody>
              {promptDirectorByTask.map(row => (
                <tr key={row.task} className="border-b last:border-0">
                  <td className="py-3 font-medium">{DIRECTOR_TASK_LABELS[row.task] || row.task}</td>
                  <td className="py-3 text-right">{fmt.format(row.jobs)}</td>
                  <td className="py-3 text-right">{fmt.format(row.succeeded)}</td>
                  <td className="py-3 text-right">{fmt.format(row.failed)}</td>
                  <td className="py-3 text-right">{fmt.format(row.uncosted)}</td>
                  <td className="py-3 text-right">{fmt.format(row.tokensCharged)}</td>
                  <td className="py-3 text-right">{fmt.format(row.refundedTokens)}</td>
                  <td className="py-3 text-right">{row.costXaf > 0 ? formatXaf(row.costXaf) : '—'}</td>
                </tr>
              ))}
              {!promptDirectorError && promptDirectorTotalJobs === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Aucun job Prompt Director sur cette période.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Répartition des coûts par fournisseur</CardTitle>
          <CardDescription>Sur les coûts connus uniquement</CardDescription>
        </CardHeader>
        <CardContent>
          {byProvider.length > 0 ? (
            <>
              <ChartContainer config={{}} className="mx-auto h-[180px] w-full max-w-[240px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={byProvider} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} strokeWidth={3}>
                    {byProvider.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="space-y-2">
                {byProvider.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />{item.name}</span>
                    <strong>{formatXaf(item.value)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Pas encore de coût connu à répartir.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
