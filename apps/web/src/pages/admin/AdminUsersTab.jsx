import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
// supabase/migrations/20260910120000_016_admin_dashboard_rpcs.sql.
// No plan/subscription (PassMark has none) and no presence/heartbeat system
// (not built) — just the real profile + token balance.

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

export default function AdminUsersTab() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const timer = setTimeout(async () => {
      const params = { p_search: search || null, p_level: levelFilter === 'all' ? null : levelFilter };
      const [{ data: listData, error: listError }, { data: countData, error: countError }] = await Promise.all([
        supabase.rpc('admin_list_users', { ...params, p_limit: PAGE_SIZE, p_offset: 0 }),
        supabase.rpc('admin_count_users', params),
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
      setLoading(false);
    }, search ? 250 : 0);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, levelFilter]);

  const sortableUsers = useMemo(() => users.map((user) => ({
    ...user,
    display_name: user.full_name || user.email,
  })), [users]);
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
                {[['User', 'display_name', 'left'], ['Phone', 'phone', 'left'], ['Level', 'level', 'left'], ['Quizzes', 'quizzes_completed', 'right'], ['Tokens', 'balance', 'right'], ['Telegram', 'is_telegram', 'left'], ['Joined', 'created_at', 'left']].map(([label, key, align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} align={align} /></TableHead>)}
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    No user matches this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
