import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Check as CheckIcon, Coins, CreditCard, Lightbulb, Loader2, Sparkles, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { supabase } from '@/lib/supabase';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';

const fmt = new Intl.NumberFormat('fr-FR');
const chartConfig = {
  succeeded: { label: 'Réussies', color: 'hsl(var(--primary))' },
  failed: { label: 'Échecs', color: '#dc2626' },
};

function Metric({ icon: Icon, label, value, detail }) {
  return <Card><CardContent className="flex items-start justify-between gap-3 p-5"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div></CardContent></Card>;
}

export default function AdminTrackingTab({ dateFilter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firstStory, setFirstStory] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const range = adminDateRangeToRpc(dateFilter);
    Promise.all([
      supabase.rpc('admin_product_tracking', { ...range, p_recent_limit: 50 }),
      supabase.rpc('admin_first_story_metrics', range),
    ]).then(async ([{ data: result, error: rpcError }, { data: firstStoryResult, error: firstStoryError }]) => {
      if (cancelled) return;
      if (rpcError) setError(rpcError.message);
      else {
        const userIds = [...new Set((result?.recent || []).map((row) => row.user_id).filter(Boolean))];
        let enrichedResult = result;
        if (userIds.length) {
          const { data: identities, error: identityError } = await supabase.rpc('admin_user_identities', { p_user_ids: userIds });
          if (cancelled) return;
          if (identityError) setError(identityError.message);
          else {
            const identityById = Object.fromEntries((identities || []).map((identity) => [identity.user_id, identity]));
            enrichedResult = {
              ...result,
              recent: (result.recent || []).map((row) => ({ ...row, ...identityById[row.user_id] })),
            };
          }
        }
        setData(enrichedResult);
        if (!firstStoryError) setFirstStory(firstStoryResult);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dateFilter]);

  const summary = data?.summary || {};
  const daily = useMemo(() => (data?.daily || []).map((row) => ({
    day: row.event_day?.slice(5, 10), succeeded: Number(row.generation_succeeded || 0), failed: Number(row.generation_failed || 0),
  })), [data]);
  const { sortedRows: sortedGenerations, sort: generationSort, toggleSort: toggleGenerationSort } = useAdminTableSort(data?.by_generation || [], 'token_cost', 'desc');
  const { sortedRows: sortedRecent, sort: recentSort, toggleSort: toggleRecentSort } = useAdminTableSort(data?.recent || [], 'occurred_at', 'desc');
  const { sortedRows: sortedFirstStorySteps, sort: firstStoryStepSort, toggleSort: toggleFirstStoryStepSort } = useAdminTableSort(firstStory?.by_step || [], 'total', 'desc');
  const { sortedRows: sortedFirstStoryExits, sort: firstStoryExitSort, toggleSort: toggleFirstStoryExitSort } = useAdminTableSort(firstStory?.by_exit || [], 'total', 'desc');
  const exitLabels = { dashboard: 'Dashboard', tokens: 'Acheter des tokens', subscription: 'Voir les abonnements', video: 'Transformer en vidéo' };
  const stepLabels = { welcome: 'Accueil', idea: 'Idée', style: 'Style', character: 'Personnage', review: 'Validation', generating: 'Génération', reveal: 'Reveal', completed: 'Terminé' };

  return <div className="space-y-6">
    <div><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Tracking produit</h2>{loading && <Loader2 className="h-4 w-4 animate-spin" />}</div><p className="mt-1 text-sm text-muted-foreground">Événements métier confirmés côté serveur · {dateFilter?.label}</p></div>
    {error && <p className="text-sm text-destructive">Erreur de chargement : {error}</p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Metric icon={Activity} label="Événements" value={fmt.format(summary.events || 0)} detail={`${fmt.format(summary.users || 0)} utilisateurs`} />
      <Metric icon={Sparkles} label="Générations réussies" value={fmt.format(summary.generation_succeeded || 0)} detail={`${fmt.format(summary.generation_failed || 0)} échecs`} />
      <Metric icon={Coins} label="Tokens consommés" value={fmt.format(summary.tokens_debited || 0)} detail={`${fmt.format(summary.tokens_credited || 0)} crédités/remboursés`} />
      <Metric icon={CreditCard} label="Packs de tokens" value={fmt.format(summary.token_pack_purchases || 0)} detail={`${fmt.format(summary.token_pack_revenue_xaf || 0)} FCFA`} />
      <Metric icon={Users} label="Abonnements" value={fmt.format((summary.subscription_payments || 0) + (summary.subscription_renewals || 0))} detail={`${fmt.format(summary.subscription_cancellations || 0)} résiliations`} />
    </div>

    {firstStory && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-primary" />AHA moment · First Story</CardTitle><CardDescription>Activation, révélation et budget d’acquisition sur la période</CardDescription></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Metric icon={Users} label="Éligibles / démarrés" value={`${fmt.format(firstStory.summary?.started || 0)} / ${fmt.format(firstStory.summary?.eligible || 0)}`} detail={`${firstStory.summary?.start_rate || 0}% démarrent`} /><Metric icon={Sparkles} label="AHA atteint" value={fmt.format(firstStory.summary?.reveal_viewed || 0)} detail={`${firstStory.summary?.aha_rate || 0}% des parcours démarrés`} /><Metric icon={CheckIcon} label="Terminés" value={fmt.format(firstStory.summary?.completed || 0)} detail={`${firstStory.summary?.completion_rate || 0}% · ${fmt.format(firstStory.summary?.abandoned || 0)} abandons 24 h`} /><Metric icon={Coins} label="Budget consommé" value={`${fmt.format(firstStory.budget?.net_consumed || 0)} tokens`} detail={`${fmt.format(firstStory.budget?.refunded || 0)} remboursés`} /><Metric icon={Activity} label="Temps vers AHA" value={`${firstStory.summary?.average_minutes_to_reveal || 0} min`} detail="Moyenne des reveals atteints" /></div></CardContent></Card>}

    {firstStory && <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Position actuelle dans le parcours</CardTitle><CardDescription>Permet d’identifier précisément l’étape où les utilisateurs s’arrêtent</CardDescription></CardHeader><CardContent><table className="w-full text-sm"><thead><tr className="border-b"><th className="pb-2 text-left"><SortableTableHeader label="Étape" sortKey="step" sort={firstStoryStepSort} onSort={toggleFirstStoryStepSort} /></th><th className="pb-2"><SortableTableHeader label="Utilisateurs" sortKey="total" sort={firstStoryStepSort} onSort={toggleFirstStoryStepSort} align="right" /></th></tr></thead><tbody>{sortedFirstStorySteps.map(row => <tr key={row.step} className="border-b last:border-0"><td className="py-3">{stepLabels[row.step] || row.step}</td><td className="py-3 text-right font-medium">{fmt.format(row.total || 0)}</td></tr>)}</tbody></table>{!sortedFirstStorySteps.length && <p className="py-8 text-center text-sm text-muted-foreground">Aucun parcours sur cette période.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Budget d’acquisition First Story</CardTitle><CardDescription>Budget interne séparé et invisible dans le portefeuille utilisateur</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-4"><Metric icon={Coins} label="Accordés" value={fmt.format(firstStory.budget?.granted || 0)} detail="Budget d’acquisition" /><Metric icon={Coins} label="Débités" value={fmt.format(firstStory.budget?.debited || 0)} detail="Générations lancées" /><Metric icon={Coins} label="Remboursés" value={fmt.format(firstStory.budget?.refunded || 0)} detail="Échecs techniques" /><Metric icon={Coins} label="Coût net" value={fmt.format(firstStory.budget?.net_consumed || 0)} detail="Débités moins remboursés" /></CardContent></Card></div>}

    {firstStory && <Card><CardHeader><CardTitle className="text-base">Choix après le reveal et conversion réelle</CardTitle><CardDescription>Les ventes comptent uniquement après confirmation serveur du paiement</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground">{[['Destination','exit_destination','left'],['Clics','total','right'],['Acheteurs tokens','token_buyers','right'],['Conversion tokens','token_conversion_rate','right'],['CA tokens','token_revenue_xaf','right'],['Abonnés','subscribers','right'],['Conversion abonnement','subscription_conversion_rate','right'],['Délai achat tokens','average_minutes_to_token_purchase','right'],['Délai abonnement','average_minutes_to_subscription','right']].map(([label,key,align]) => <th key={key} className="pb-2"><SortableTableHeader label={label} sortKey={key} sort={firstStoryExitSort} onSort={toggleFirstStoryExitSort} align={align} /></th>)}</tr></thead><tbody>{sortedFirstStoryExits.map(row => <tr key={row.exit_destination} className="border-b last:border-0"><td className="py-3 font-medium">{exitLabels[row.exit_destination] || row.exit_destination}</td><td className="py-3 text-right">{fmt.format(row.total || 0)}</td><td className="py-3 text-right">{fmt.format(row.token_buyers || 0)}</td><td className="py-3 text-right">{row.token_conversion_rate || 0}%</td><td className="py-3 text-right">{fmt.format(row.token_revenue_xaf || 0)} FCFA</td><td className="py-3 text-right">{fmt.format(row.subscribers || 0)}</td><td className="py-3 text-right">{row.subscription_conversion_rate || 0}%</td><td className="py-3 text-right">{row.average_minutes_to_token_purchase == null ? '—' : `${row.average_minutes_to_token_purchase} min`}</td><td className="py-3 text-right">{row.average_minutes_to_subscription == null ? '—' : `${row.average_minutes_to_subscription} min`}</td></tr>)}</tbody></table>{!loading && !sortedFirstStoryExits.length && <p className="py-8 text-center text-sm text-muted-foreground">Aucun choix final enregistré sur cette période.</p>}</CardContent></Card>}

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">Générations quotidiennes</CardTitle><CardDescription>Réussites et échecs dans la période sélectionnée</CardDescription></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[260px] w-full"><AreaChart data={daily}><CartesianGrid vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Area dataKey="succeeded" stroke="var(--color-succeeded)" fill="var(--color-succeeded)" fillOpacity={0.15} /><Area dataKey="failed" stroke="var(--color-failed)" fill="var(--color-failed)" fillOpacity={0.08} /></AreaChart></ChartContainer></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Répartition par forfait</CardTitle><CardDescription>Événements et utilisateurs distincts</CardDescription></CardHeader><CardContent className="space-y-3">{(data?.by_plan || []).map((row) => <div key={row.plan_id} className="flex items-center justify-between border-b pb-3 text-sm last:border-0"><span className="capitalize">{row.plan_id}</span><span><strong>{fmt.format(row.total)}</strong> événements · {fmt.format(row.users)} utilisateurs</span></div>)}{!loading && !(data?.by_plan || []).length && <p className="text-sm text-muted-foreground">Aucune donnée.</p>}</CardContent></Card>
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card><CardHeader><CardTitle className="text-base">Tous les événements suivis</CardTitle><CardDescription>Aucun type d’événement collecté n’est masqué</CardDescription></CardHeader><CardContent className="space-y-3">{(data?.by_event || []).map((row) => <div key={row.event_name} className="flex justify-between gap-3 border-b pb-3 text-sm last:border-0"><span>{row.event_name}</span><span><strong>{fmt.format(row.total)}</strong> · {fmt.format(row.users)} utilisateurs</span></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Revenus d’abonnement</CardTitle><CardDescription>Conservés par devise, sans conversion artificielle</CardDescription></CardHeader><CardContent className="space-y-3">{(data?.by_subscription_currency || []).map((row) => <div key={row.currency} className="flex justify-between gap-3 border-b pb-3 text-sm last:border-0"><span>{row.currency}</span><span><strong>{fmt.format(row.revenue)}</strong> · {fmt.format(row.payments)} paiements</span></div>)}{!loading && !(data?.by_subscription_currency || []).length && <p className="text-sm text-muted-foreground">Aucun paiement.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Mouvements de tokens</CardTitle><CardDescription>Débits, crédits et remboursements par action</CardDescription></CardHeader><CardContent className="space-y-3">{(data?.by_token_action || []).map((row) => <div key={`${row.event_name}-${row.action_type}`} className="border-b pb-3 text-sm last:border-0"><div className="flex justify-between gap-3"><span>{row.action_type}</span><strong>{fmt.format(row.tokens)} tokens</strong></div><p className="mt-1 text-xs text-muted-foreground">{row.event_name} · {fmt.format(row.transactions)} transactions</p></div>)}{!loading && !(data?.by_token_action || []).length && <p className="text-sm text-muted-foreground">Aucun mouvement.</p>}</CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle className="text-base">Performance par modèle et type de génération</CardTitle><CardDescription>Volumes, réussite, échecs et coût en tokens</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground">{[['Type','job_type','left'],['Modèle','model','left'],['Total','total','right'],['Réussies','succeeded','right'],['Échecs','failed','right'],['Tokens','token_cost','right']].map(([label,key,align]) => <th key={key} className="pb-2"><SortableTableHeader label={label} sortKey={key} sort={generationSort} onSort={toggleGenerationSort} align={align} /></th>)}</tr></thead><tbody>{sortedGenerations.map((row) => <tr key={`${row.job_type}-${row.model}`} className="border-b last:border-0"><td className="py-3">{row.job_type}</td><td className="py-3">{row.model}</td><td className="py-3 text-right">{fmt.format(row.total)}</td><td className="py-3 text-right">{fmt.format(row.succeeded)}</td><td className="py-3 text-right">{fmt.format(row.failed)}</td><td className="py-3 text-right">{fmt.format(row.token_cost)}</td></tr>)}</tbody></table></CardContent></Card>

    <Card><CardHeader><CardTitle className="text-base">Activité récente</CardTitle><CardDescription>Les 50 derniers événements de la période</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground">{[['Date','occurred_at'],['Événement','event_name'],['Forfait','plan_id'],['Utilisateur','user_email']].map(([label,key]) => <th key={key} className="pb-2"><SortableTableHeader label={label} sortKey={key} sort={recentSort} onSort={toggleRecentSort} /></th>)}</tr></thead><tbody>{sortedRecent.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="py-3">{new Date(row.occurred_at).toLocaleString('fr-FR')}</td><td className="py-3">{row.event_name}</td><td className="py-3 capitalize">{row.plan_id || '—'}</td><td className="py-3"><p className="font-medium">{row.user_full_name || row.user_email || 'Utilisateur inconnu'}</p><p className="text-xs text-muted-foreground">{row.user_email || 'Aucun email'}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{row.user_id || '—'}</p></td></tr>)}</tbody></table></CardContent></Card>
  </div>;
}
