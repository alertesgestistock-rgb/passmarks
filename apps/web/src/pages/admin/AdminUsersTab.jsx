import React, { useEffect, useMemo, useState } from 'react';
import { Circle, Search, ShieldCheck, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';

// Source: public.admin_list_users(p_search, p_level, p_limit, p_offset) and
// public.admin_count_users(...) — see
// supabase/migrations/20260910120000_016_admin_dashboard_rpcs.sql. No plan/
// subscription (PassMark has none) — just the real profile + token balance.
//
// "Online"/"Time spent" come from public.admin_user_activity(p_since,
// p_until) — see supabase/migrations/20260910140000_018_activity_heartbeats.sql,
// fed by the heartbeat <ActivityHeartbeat /> sends every 60s (mounted
// globally in App.jsx) while a tab is visible. "Online" = last heartbeat
// < 90s ago, and is NEVER bounded by the period filter — otherwise someone
// active right now would show offline just because "Today" was picked at
// 00:01. "Time spent" does follow the period. Both stay empty for anyone
// who hasn't reloaded the app since this shipped — that's expected, not a bug.

const ONLINE_THRESHOLD_MS = 90 * 1000;
const PAGE_SIZE = 50;

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPhone(country, phone) {
  if (!phone) return '—';
  return country ? `+${country} ${phone}` : phone;
}

function formatDuration(minutes) {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function isOnline(lastHeartbeatAt) {
  if (!lastHeartbeatAt) return false;
  return Date.now() - new Date(lastHeartbeatAt).getTime() < ONLINE_THRESHOLD_MS;
}

function formatLastSeen(lastHeartbeatAt) {
  if (!lastHeartbeatAt) return 'Never seen';
  const minutesAgo = Math.floor((Date.now() - new Date(lastHeartbeatAt).getTime()) / 60000);
  if (minutesAgo <= 1) return 'Just now';
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  if (minutesAgo < 1440) return `${Math.floor(minutesAgo / 60)}h ago`;
  return `${Math.floor(minutesAgo / 1440)}d ago`;
}

export default function AdminUsersTab({ dateFilter }) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activityByUser, setActivityByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);
    const activityParams = { p_since: p_from || '1970-01-01T00:00:00Z', p_until: p_to || new Date().toISOString() };

    function applyActivity(rows) {
      const byUser = {};
      (rows || []).forEach((row) => {
        byUser[row.user_id] = { totalMinutes: row.total_minutes, lastHeartbeatAt: row.last_heartbeat_at };
      });
      setActivityByUser(byUser);
    }

    const timer = setTimeout(async () => {
      const params = { p_search: search || null, p_level: levelFilter === 'all' ? null : levelFilter };
      const [{ data: listData, error: listError }, { data: countData, error: countError }, { data: activityData }] = await Promise.all([
        supabase.rpc('admin_list_users', { ...params, p_limit: PAGE_SIZE, p_offset: 0 }),
        supabase.rpc('admin_count_users', params),
        supabase.rpc('admin_user_activity', activityParams),
      ]);
      if (cancelled) return;
      if (listError || countError) {
        setError((listError || countError).message);
        setUsers([]);
        setTotalCount(0);
      } else {
        setUsers(listData || []);
        setTotalCount(countData ?? 0);
      }
      applyActivity(activityData);
      setLoading(false);
    }, search ? 250 : 0);

    // Refresh just the activity (not the whole list) every 30s so the
    // "online" badge stays fresh while this tab stays open.
    const refreshActivity = setInterval(() => {
      supabase.rpc('admin_user_activity', activityParams).then(({ data }) => {
        if (!cancelled) applyActivity(data);
      });
    }, 30000);

    return () => { cancelled = true; clearTimeout(timer); clearInterval(refreshActivity); };
  }, [search, levelFilter, dateFilter]);

  const sortableUsers = useMemo(() => users.map((user) => ({
    ...user,
    display_name: user.full_name || user.email,
    activity_minutes: activityByUser[user.id]?.totalMinutes,
    last_heartbeat_at: activityByUser[user.id]?.lastHeartbeatAt,
    online: isOnline(activityByUser[user.id]?.lastHeartbeatAt) ? 1 : 0,
  })), [users, activityByUser]);
  const { sortedRows: sorted, sort, toggleSort } = useAdminTableSort(sortableUsers, 'created_at', 'desc');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Users</CardTitle>
              <CardDescription>
                {totalCount} account{totalCount > 1 ? 's' : ''} total · {sorted.length} shown
                {' · Presence/time spent over: '}{dateFilter?.label || 'Last 7 days'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, email or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-56"
                />
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="O Level">O Level</SelectItem>
                  <SelectItem value="A Level">A Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <p className="px-6 py-4 text-sm text-destructive">Couldn't load users: {error}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {[['User', 'display_name', 'left'], ['Phone', 'phone', 'left'], ['Level', 'level', 'left'], ['Presence', 'online', 'left'], [`Time spent (${dateFilter?.label || 'Last 7 days'})`, 'activity_minutes', 'right'], ['Quizzes', 'quizzes_completed', 'right'], ['Tokens', 'balance', 'right'], ['Telegram', 'is_telegram', 'left'], ['Joined', 'created_at', 'left']].map(([label, key, align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} align={align} /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials(u.full_name || u.email)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium truncate">{u.full_name || '—'}</p>
                          {u.role === 'admin' && (
                            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" aria-label="Admin" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatPhone(u.phone_country, u.phone)}
                  </TableCell>
                  <TableCell>{u.level || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Circle className={`h-2 w-2 shrink-0 ${isOnline(activityByUser[u.id]?.lastHeartbeatAt) ? 'fill-emerald-500 text-emerald-500' : 'fill-muted-foreground/40 text-muted-foreground/40'}`} />
                      <span className={isOnline(activityByUser[u.id]?.lastHeartbeatAt) ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>
                        {isOnline(activityByUser[u.id]?.lastHeartbeatAt) ? 'Online' : formatLastSeen(activityByUser[u.id]?.lastHeartbeatAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatDuration(activityByUser[u.id]?.totalMinutes)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{u.quizzes_completed ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {Number(u.balance ?? 0).toLocaleString('en-US')}
                  </TableCell>
                  <TableCell>
                    {u.is_telegram ? <Badge variant="outline" className="gap-1"><Send className="h-3 w-3" />Linked</Badge> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                </TableRow>
              ))}
              {!loading && sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    No user matches this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        "Presence" and "Time spent" fill in as people reconnect (heartbeat sent every 60s per active
        tab, shipped 2026-09-10) — empty for anyone who hasn't reopened the app since, that's expected.
      </p>
    </div>
  );
}
