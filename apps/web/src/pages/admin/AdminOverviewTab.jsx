import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, DollarSign, Loader2, Music2, Percent, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { supabase } from '@/lib/supabase';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const numberFormat = new Intl.NumberFormat('fr-FR');
const moneyFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const chartConfig = {
  signups: { label: 'Inscriptions', color: 'hsl(var(--primary))' },
  revenue_xaf: { label: 'Revenus (FCFA)', color: 'hsl(var(--primary))' },
};

function KpiCard({ icon: Icon, label, value, sub }) {
  return <Card><CardContent className="flex items-start justify-between gap-4 p-6"><div className="min-w-0"><p className="truncate text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p></div><div className="shrink-0 rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div></CardContent></Card>;
}

function formatDay(value) {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function AdminOverviewTab({ dateFilter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const range = adminDateRangeToRpc(dateFilter);
    supabase.rpc('admin_dashboard_overview', range).then(({ data: result, error: rpcError }) => {
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message);
        setData(null);
      } else setData(result);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dateFilter]);

  const chartData = useMemo(() => (data?.daily || []).map((row) => ({
    ...row,
    label: formatDay(row.date),
    signups: Number(row.signups || 0),
    revenue_xaf: Number(row.revenue_xaf || 0),
  })), [data]);

  if (loading) return <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Chargement des indicateurs…</div>;
  if (error) return <Card><CardContent className="p-6 text-sm text-destructive">Impossible de charger le tableau de bord : {error}</CardContent></Card>;

  const conversion = Number(data?.conversion_rate || 0);
  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard icon={Users} label="Utilisateurs" value={numberFormat.format(data?.users_total || 0)} sub={`+${numberFormat.format(data?.new_users || 0)} sur la période`} />
      <KpiCard icon={DollarSign} label="Revenus" value={`${moneyFormat.format(data?.revenue_xaf || 0)} FCFA`} sub={`${numberFormat.format(data?.transactions || 0)} transactions confirmées`} />
      <KpiCard icon={Music2} label="Contenus créés" value={numberFormat.format(data?.content_created || 0)} sub={`${numberFormat.format(data?.shares || 0)} partages publiés`} />
      <KpiCard icon={CreditCard} label="Transactions" value={numberFormat.format(data?.transactions || 0)} sub={`${numberFormat.format(data?.paying_users || 0)} utilisateurs payants`} />
      <KpiCard icon={Percent} label="Taux de conversion" value={`${moneyFormat.format(conversion)}%`} sub={`${numberFormat.format(data?.converted_signups || 0)} inscrits de la période devenus payants`} />
    </div>

    {(data?.unconverted_currencies || []).length > 0 && <p className="text-xs text-amber-700">Revenus non convertis exclus du total FCFA : {(data.unconverted_currencies || []).join(', ')}.</p>}

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[{ title: 'Inscriptions', key: 'signups', total: `${numberFormat.format(data?.new_users || 0)} total` }, { title: 'Revenus', key: 'revenue_xaf', total: `${moneyFormat.format(data?.revenue_xaf || 0)} FCFA total` }].map(({ title, key, total }) => <Card key={key}><CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" />{title}</CardTitle><CardDescription>{total} · {dateFilter?.label || '7 derniers jours'}</CardDescription></CardHeader><CardContent>{chartData.length ? <ChartContainer config={chartConfig} className="h-[220px] w-full"><AreaChart data={chartData}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Area dataKey={key} type="monotone" fill={`var(--color-${key})`} fillOpacity={0.15} stroke={`var(--color-${key})`} /></AreaChart></ChartContainer> : <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Aucune donnée sur cette période.</div>}</CardContent></Card>)}
    </div>
  </div>;
}
