import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Loader2, Search, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';

// Source: public.admin_token_dashboard(p_from, p_to) and
// public.admin_token_users(p_search, p_limit, p_offset) — see
// supabase/migrations/20260910120000_016_admin_dashboard_rpcs.sql.
// PassMark has one wallet balance per user (token_wallets), not Raconty's
// four-bucket permanent/subscription/promo/reward system, and no manual
// token-grant RPC yet — this tab is read-only for now.

const ACTION_LABEL = {
  signup_bonus: 'Signup bonus', purchase: 'Purchase', message: 'AI Tutor message',
  tag_question: 'Question tagging', image: 'Image upload', pdf: 'PDF upload',
  mock_exam: 'Mock exam', report: 'Report', quiz: 'Quiz', daily_bonus: 'Daily bonus',
  acquisition_source_bonus: 'Onboarding: source', phone_bonus: 'Onboarding: phone',
  first_ai_question_bonus: 'Onboarding: first AI question', referral_signup_bonus: 'Referral bonus',
  first_token_purchase_bonus: 'Onboarding: first purchase', first_paper_read_bonus: 'Onboarding: first paper',
  four_tools_bonus: 'Onboarding: four tools', seven_day_streak_bonus: 'Onboarding: 7-day streak',
  quiz_generation: 'Quiz generation', message_with_context: 'AI Tutor message (with context)', voice: 'Voice message',
};

const n = (value) => Number(value || 0).toLocaleString('en-US');

function Metric({ icon: Icon, label, value, description }) {
  return <Card><CardContent className="p-5 flex justify-between gap-3"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{n(value)}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><div className="rounded-md bg-primary/10 p-2 text-primary h-fit"><Icon className="h-4 w-4" /></div></CardContent></Card>;
}

export default function AdminTokensTab({ dateFilter }) {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      const [summaryResult, usersResult] = await Promise.all([
        supabase.rpc('admin_token_dashboard', adminDateRangeToRpc(dateFilter)),
        supabase.rpc('admin_token_users', { p_search: search || null, p_limit: 100, p_offset: 0 }),
      ]);
      if (cancelled) return;
      if (summaryResult.error || usersResult.error) setError((summaryResult.error || usersResult.error).message);
      setDashboard(summaryResult.data || null);
      setUsers(usersResult.data || []);
      setLoading(false);
    }, search ? 250 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [dateFilter, search]);

  const sortable = useMemo(() => users.map((row) => ({ ...row, display_user: row.full_name || row.email })), [users]);
  const { sortedRows, sort, toggleSort } = useAdminTableSort(sortable, 'balance', 'desc');

  return <div className="space-y-4">
    <div><h2 className="text-xl font-semibold flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /> Tokens</h2><p className="text-sm text-muted-foreground">Balances (all-time) and movements over: {dateFilter?.label || 'Last 7 days'}</p></div>
    {error && <Card className="border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Couldn't load token data: {error}</CardContent></Card>}

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Metric icon={Wallet} label="Total balance" value={dashboard?.total_balance} description="Across all wallets, right now" />
      <Metric icon={TrendingUp} label="Total earned (all-time)" value={dashboard?.total_earned} description="Purchases, bonuses, rewards" />
      <Metric icon={TrendingDown} label="Total spent (all-time)" value={dashboard?.total_spent} description="AI Tutor, quizzes, uploads" />
      <Metric icon={Coins} label="Net movement (period)" value={(dashboard?.period_earned || 0) - (dashboard?.period_spent || 0)} description={`+${n(dashboard?.period_earned)} / -${n(dashboard?.period_spent)}`} />
    </div>

    <Card>
      <CardHeader><CardTitle className="text-base">Movements by action</CardTitle><CardDescription>Net tokens earned or spent per action type, on this period</CardDescription></CardHeader>
      <CardContent className="space-y-2">
        {(dashboard?.movements_by_action || []).map((row) => (
          <div key={row.action} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
            <span>{ACTION_LABEL[row.action] || row.action}</span>
            <span className={`text-sm tabular-nums font-medium ${row.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{row.net >= 0 ? '+' : ''}{n(row.net)}</span>
          </div>
        ))}
        {!dashboard?.movements_by_action?.length && <p className="text-sm text-muted-foreground">No movement on this period.</p>}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div><CardTitle className="text-base">Wallets by user</CardTitle><CardDescription>Sorted by current balance</CardDescription></div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-60" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email…" />
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin self-center" />}
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {[['User', 'display_user', 'left'], ['Balance', 'balance', 'right'], ['Earned', 'total_earned', 'right'], ['Spent', 'total_spent', 'right'], ['Unsettled AI cost', 'pending_cost_usd', 'right']].map(([label, key, align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} align={align} /></TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.user_id}>
                <TableCell><p className="font-medium">{row.full_name || '—'}</p><p className="text-xs text-muted-foreground">{row.email}</p></TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{n(row.balance)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{n(row.total_earned)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{n(row.total_spent)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">${Number(row.pending_cost_usd || 0).toFixed(4)}</TableCell>
              </TableRow>
            ))}
            {!loading && !sortedRows.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No wallet found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    <p className="text-xs text-muted-foreground">Manual token grants aren't built yet — this tab is read-only for now.</p>
  </div>;
}
