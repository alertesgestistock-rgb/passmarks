import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CreditCard, DollarSign, Loader2, BookOpen, Percent, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { supabase } from '@/lib/supabase';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Source: public.admin_dashboard_overview(p_from, p_to) — see
// supabase/migrations/20260910120000_016_admin_dashboard_rpcs.sql (base
// metrics) and 20260910160000_020_admin_overview_active_users.sql
// (active_users/online_now, added on top of the heartbeat system from
// 20260910140000_018_activity_heartbeats.sql). Written for PassMark's real
// schema (token_purchases/token_wallets, quiz stats, conversations) — not a
// Raconty video/subscription dashboard.
//
// "Active users" follows the date-range filter like signups/revenue.
// "Online now" deliberately does NOT — it's refreshed on its own 30s timer,
// independent of dateFilter, because "who's online right now" shouldn't
// change just because someone picked "This month" instead of "Today".

const numberFormat = new Intl.NumberFormat('en-US');
const moneyFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const chartConfig = {
  signups: { label: 'Signups', color: 'hsl(var(--primary))' },
  revenue_xaf: { label: 'Revenue (XAF)', color: 'hsl(var(--primary))' },
};

function KpiCard({ icon: Icon, label, value, sub, live }) {
  return <Card><CardContent className="flex items-start justify-between gap-4 p-6"><div className="min-w-0"><p className="truncate text-sm text-muted-foreground flex items-center gap-1.5">{label}{live && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}</p><p className="mt-1 text-2xl font-semibold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p></div><div className="shrink-0 rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div></CardContent></Card>;
}

function formatDay(value) {
  return new Date(value).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
}

export default function AdminOverviewTab({ dateFilter }) {
  const [data, setData] = useState(null);
  const [onlineNow, setOnlineNow] = useState(null);
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
      } else {
        setData(result);
        if (onlineNow == null) setOnlineNow(result?.online_now ?? 0);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  // "Online now" refreshes on its own — a period change shouldn't be the
  // only thing that updates it, and it shouldn't wait 7 days to refresh.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      supabase.rpc('admin_dashboard_overview', { p_from: null, p_to: null }).then(({ data: result, error: rpcError }) => {
        if (!cancelled && !rpcError) setOnlineNow(result?.online_now ?? 0);
      });
    };
    const interval = setInterval(refresh, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const chartData = useMemo(() => (data?.daily || []).map((row) => ({
    ...row,
    label: formatDay(row.date),
    signups: Number(row.signups || 0),
    revenue_xaf: Number(row.revenue_xaf || 0),
  })), [data]);

  if (loading) return <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading metrics…</div>;
  if (error) return <Card><CardContent className="p-6 text-sm text-destructive">Couldn't load the dashboard: {error}</CardContent></Card>;

  const conversion = Number(data?.conversion_rate || 0);
  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard icon={Users} label="Users" value={numberFormat.format(data?.users_total || 0)} sub={`+${numberFormat.format(data?.new_users || 0)} in this period`} />
      <KpiCard icon={Activity} label="Online now" value={numberFormat.format(onlineNow ?? data?.online_now ?? 0)} sub="Right now, any period" live />
      <KpiCard icon={Users} label="Active users" value={numberFormat.format(data?.active_users || 0)} sub={`Had a session in: ${dateFilter?.label || 'Last 7 days'}`} />
      <KpiCard icon={DollarSign} label="Revenue" value={`${moneyFormat.format(data?.revenue_xaf || 0)} XAF`} sub={`${numberFormat.format(data?.transactions || 0)} confirmed purchases`} />
      <KpiCard icon={BookOpen} label="Study activity" value={numberFormat.format(data?.content_created || 0)} sub="Quizzes completed + AI Tutor chats started" />
      <KpiCard icon={CreditCard} label="Transactions" value={numberFormat.format(data?.transactions || 0)} sub={`${numberFormat.format(data?.paying_users || 0)} paying users`} />
      <KpiCard icon={Percent} label="Conversion rate" value={`${moneyFormat.format(conversion)}%`} sub={`${numberFormat.format(data?.converted_signups || 0)} signups from this period who converted`} />
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[{ title: 'Signups', key: 'signups', total: `${numberFormat.format(data?.new_users || 0)} total` }, { title: 'Revenue', key: 'revenue_xaf', total: `${moneyFormat.format(data?.revenue_xaf || 0)} XAF total` }].map(({ title, key, total }) => <Card key={key}><CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" />{title}</CardTitle><CardDescription>{total} · {dateFilter?.label || 'Last 7 days'}</CardDescription></CardHeader><CardContent>{chartData.length ? <ChartContainer config={chartConfig} className="h-[220px] w-full"><AreaChart data={chartData}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Area dataKey={key} type="monotone" fill={`var(--color-${key})`} fillOpacity={0.15} stroke={`var(--color-${key})`} /></AreaChart></ChartContainer> : <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No data for this period.</div>}</CardContent></Card>)}
    </div>
  </div>;
}
