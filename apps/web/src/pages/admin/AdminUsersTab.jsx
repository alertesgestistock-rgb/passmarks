import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ShieldCheck, ChevronRight, Circle, Loader2, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';

// -----------------------------------------------------------------------------
// Onglet Utilisateurs — branché sur les vraies données (2026-08-09).
//
// Source : RPC public.admin_list_users(p_search, p_plan, p_limit, p_offset)
// et public.admin_count_users(...), réelles en base depuis les migrations
// 20260808000001/000003. Chaque appel est gardé côté serveur par is_admin().
// Décision produit du 2026-08-09 : ces deux RPC ne prennent PAS la période
// globale — le total de comptes reste "depuis toujours", volontairement.
//
// "Temps passé" et "Présence" viennent de public.admin_user_activity(p_since,
// p_until) (migration 20260809000007/000008), alimentée par le heartbeat
// envoyé toutes les 60s par <ActivityHeartbeat /> (monté globalement dans
// App.jsx) tant qu'un utilisateur a un onglet visible. "En ligne" = dernier
// heartbeat < 90s (jamais borné par la période, sinon un utilisateur
// connecté "hier" apparaîtrait hors-ligne dès qu'on choisit "Aujourd'hui").
// "Temps passé", lui, suit bien la période sélectionnée (dateFilter) — vide
// pour un compte sans heartbeat sur cette période, c'est normal, pas un bug.
// -----------------------------------------------------------------------------

const ONLINE_THRESHOLD_MS = 90 * 1000;

const PLAN_LABEL = { free: 'Gratuit', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };

const STATUS_STYLE = {
  active: 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  trialing: 'border-transparent bg-sky-500/15 text-sky-600 dark:text-sky-400',
  past_due: 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400',
  cancelled: 'border-transparent bg-muted text-muted-foreground',
};

const STATUS_LABEL = {
  active: 'Actif',
  trialing: 'Essai',
  past_due: 'Paiement en attente',
  cancelled: 'Résilié',
};

const PAGE_SIZE = 50;

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function formatDuration(minutes) {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPhone(countryCode, phoneNumber) {
  if (!phoneNumber) return '—';
  const prefix = countryCode?.trim() || '';
  const number = phoneNumber.trim();
  if (!prefix || number.startsWith('+')) return number;
  return `${prefix} ${number}`;
}

function isOnline(lastHeartbeatAt) {
  if (!lastHeartbeatAt) return false;
  return Date.now() - new Date(lastHeartbeatAt).getTime() < ONLINE_THRESHOLD_MS;
}

function formatLastSeen(lastHeartbeatAt) {
  if (!lastHeartbeatAt) return 'Jamais vu';
  const minutesAgo = Math.floor((Date.now() - new Date(lastHeartbeatAt).getTime()) / 60000);
  if (minutesAgo <= 1) return 'À l\'instant';
  if (minutesAgo < 60) return `Il y a ${minutesAgo} min`;
  if (minutesAgo < 1440) return `Il y a ${Math.floor(minutesAgo / 60)} h`;
  return `Il y a ${Math.floor(minutesAgo / 1440)} j`;
}

export default function AdminUsersTab({ dateFilter }) {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [timeSpentByUser, setTimeSpentByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);
    const activityParams = { p_since: p_from || '1970-01-01T00:00:00Z', p_until: p_to };

    (async () => {
      const [{ data: listData, error: listError }, { data: countData, error: countError }, { data: activityData }] = await Promise.all([
        supabase.rpc('admin_list_users', {
          p_search: search || null,
          p_plan: planFilter === 'all' ? null : planFilter,
          p_limit: PAGE_SIZE,
          p_offset: 0,
        }),
        supabase.rpc('admin_count_users', {
          p_search: search || null,
          p_plan: planFilter === 'all' ? null : planFilter,
        }),
        supabase.rpc('admin_user_activity', activityParams),
      ]);

      if (cancelled) return;

      if (listError || countError) {
        setError((listError || countError).message);
        setUsers([]);
        setTotalCount(0);
      } else {
        const listedUsers = listData || [];
        let enrichedUsers = listedUsers;
        if (listedUsers.length) {
          const { data: portfolios } = await supabase.rpc('admin_user_token_portfolios', {
            p_user_ids: listedUsers.map((user) => user.id),
          });
          if (portfolios?.length) {
            const byId = new Map(portfolios.map((portfolio) => [portfolio.user_id, portfolio]));
            enrichedUsers = listedUsers.map((user) => {
              const portfolio = byId.get(user.id);
              return portfolio ? { ...user, ...portfolio, token_balance: portfolio.total_tokens } : user;
            });
          }
        }
        if (cancelled) return;
        setUsers(enrichedUsers);
        setTotalCount(countData ?? 0);
      }

      const byUser = {};
      (activityData || []).forEach((row) => {
        byUser[row.user_id] = { totalMinutes: row.total_minutes, lastHeartbeatAt: row.last_heartbeat_at };
      });
      setTimeSpentByUser(byUser);
      setLoading(false);
    })();

    // Rafraîchit juste l'activité (pas la liste complète) toutes les 30s pour
    // garder le badge "en ligne" à jour pendant que l'onglet reste ouvert,
    // sur la même période que la charge initiale.
    const refreshActivity = setInterval(() => {
      supabase.rpc('admin_user_activity', activityParams).then(({ data }) => {
        if (cancelled) return;
        const byUser = {};
        (data || []).forEach((row) => {
          byUser[row.user_id] = { totalMinutes: row.total_minutes, lastHeartbeatAt: row.last_heartbeat_at };
        });
        setTimeSpentByUser(byUser);
      });
    }, 30000);

    return () => { cancelled = true; clearInterval(refreshActivity); };
  }, [search, planFilter, dateFilter]);

  const sortableUsers = useMemo(() => users.map((user) => ({
    ...user,
    activity_minutes: timeSpentByUser[user.id]?.totalMinutes,
    last_heartbeat_at: timeSpentByUser[user.id]?.lastHeartbeatAt,
    online: isOnline(timeSpentByUser[user.id]?.lastHeartbeatAt) ? 1 : 0,
    display_name: user.full_name || user.email,
  })), [users, timeSpentByUser]);
  const { sortedRows: sorted, sort, toggleSort } = useAdminTableSort(sortableUsers, 'created_at', 'desc');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Utilisateurs
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </CardTitle>
              <CardDescription>
                {totalCount} compte{totalCount > 1 ? 's' : ''} au total · {sorted.length} affiché{sorted.length > 1 ? 's' : ''}
                {' · Présence/temps passé sur : '}{dateFilter?.label || '7 derniers jours'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nom, email ou téléphone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-56"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Formule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les formules</SelectItem>
                  <SelectItem value="free">Gratuit</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <p className="px-6 py-4 text-sm text-destructive">Erreur de chargement : {error}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {[['Utilisateur','display_name','left'],['Téléphone','phone_number','left'],['Formule','plan','left'],['Statut','plan_status','left'],['Présence','online','left'],[`Temps passé (${dateFilter?.label || '7 derniers jours'})`,'activity_minutes','right'],['Tokens','token_balance','right'],['Inscrit le','created_at','left']].map(([label,key,align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} align={align} /></TableHead>)}
                <TableHead className="w-10" />
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
                          {u.role === 'influencer' && (
                            <Megaphone className="h-3.5 w-3.5 text-primary shrink-0" aria-label="Influenceur" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatPhone(u.country_code, u.phone_number)}
                  </TableCell>
                  <TableCell>{PLAN_LABEL[u.plan] ?? u.plan ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLE[u.plan_status] ?? ''}>
                      {STATUS_LABEL[u.plan_status] ?? u.plan_status ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Circle className={`h-2 w-2 shrink-0 ${isOnline(timeSpentByUser[u.id]?.lastHeartbeatAt) ? 'fill-emerald-500 text-emerald-500' : 'fill-muted-foreground/40 text-muted-foreground/40'}`} />
                      <span className={isOnline(timeSpentByUser[u.id]?.lastHeartbeatAt) ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>
                        {isOnline(timeSpentByUser[u.id]?.lastHeartbeatAt) ? 'En ligne' : formatLastSeen(timeSpentByUser[u.id]?.lastHeartbeatAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatDuration(timeSpentByUser[u.id]?.totalMinutes)}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    title={u.total_tokens != null
                      ? `Permanents : ${u.permanent_tokens || 0} · Abonnement : ${u.subscription_tokens || 0} · Promo : ${u.promotional_tokens || 0} · Récompenses : ${u.reward_tokens || 0}`
                      : 'Ancien solde permanent — migration Tokens non appliquée'}
                  >
                    {Number(u.token_balance ?? 0).toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    Aucun utilisateur ne correspond à ce filtre.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        "Présence" et "Temps passé" se remplissent au fil des reconnexions (heartbeat envoyé toutes les
        60s par onglet actif, depuis le 2026-08-09) — vides pour un compte qui ne s'est pas encore
        reconnecté depuis. Fiche utilisateur détaillée et actions de gestion (changer un plan, créditer des tokens, suspendre) à faire via des
        RPC admin dédiées + admin_audit_logs — voir cartographie §5.5 et §13.
      </p>
    </div>
  );
}
