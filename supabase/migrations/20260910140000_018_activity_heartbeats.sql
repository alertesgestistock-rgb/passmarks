-- =============================================================================
-- Online presence + time spent, for the Users tab of /boss. Ported from
-- Raconty's proven design (20260808000007 + 20260809000004/000008
-- user_activity_heartbeats/record_heartbeat/admin_user_activity) — one row
-- per browser-tab session (not one row per ping), upserted on session_id, so
-- the table stays small instead of growing one row every ~60s per active user.
--
-- ⚠️ PAS ENCORE EXÉCUTÉ EN BASE. À lancer par l'utilisateur lui-même via :
--   npm run supabase -- db query --linked --file "C:/Users/user/Documents/PassMark/Passmark_App/supabase/migrations/20260910140000_018_activity_heartbeats.sql"
-- Requires 20260909180000_015 (is_admin). After this, mount
-- <ActivityHeartbeat /> in App.jsx (see components/ActivityHeartbeat.jsx) —
-- the table stays empty and admin_user_activity returns nothing until then.
-- =============================================================================

create table if not exists public.user_activity_heartbeats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null unique,
  first_heartbeat_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  heartbeat_count integer not null default 1
);

comment on table public.user_activity_heartbeats is
  'One row per active browser-tab session (session_id generated client-side on '
  'load, sessionStorage — two tabs = two sessions). The client sends a light '
  'heartbeat every 60s while the tab is visible (upsert on session_id: bumps '
  'heartbeat_count, refreshes last_heartbeat_at). "Online now" = '
  'last_heartbeat_at < 90s ago; "time spent" sums (last-first) per session '
  'over a period. Survives tab crashes/closes since there is no explicit '
  'close event to rely on.';

create index if not exists user_activity_heartbeats_user_id_idx
  on public.user_activity_heartbeats (user_id);
create index if not exists user_activity_heartbeats_last_heartbeat_idx
  on public.user_activity_heartbeats (last_heartbeat_at desc);

alter table public.user_activity_heartbeats enable row level security;

drop policy if exists "users_upsert_own_heartbeats" on public.user_activity_heartbeats;
create policy "users_upsert_own_heartbeats"
  on public.user_activity_heartbeats
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- record_heartbeat — SECURITY INVOKER (not DEFINER): runs with the caller's
-- own privileges, governed by the RLS policy above, so a user can only ever
-- write their own heartbeat, never anyone else's.
create or replace function public.record_heartbeat(p_session_id text)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.user_activity_heartbeats (user_id, session_id)
  values (auth.uid(), p_session_id)
  on conflict (session_id) do update
    set last_heartbeat_at = now(),
        heartbeat_count = public.user_activity_heartbeats.heartbeat_count + 1;
$$;

revoke execute on function public.record_heartbeat(text) from public, anon;
grant execute on function public.record_heartbeat(text) to authenticated;

-- admin_user_activity — last known heartbeat (client derives "online" from
-- it: < 90s ago) + time spent aggregated over [p_since, p_until].
-- "Online" is intentionally NOT bounded by the period filter (see comment in
-- AdminUsersTab.jsx) — only "time spent" follows the selected date range.
create or replace function public.admin_user_activity(
  p_since timestamptz default (now() - interval '7 days'),
  p_until timestamptz default now()
)
returns table (
  user_id uuid,
  last_heartbeat_at timestamptz,
  total_minutes integer,
  session_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.user_id,
    max(h.last_heartbeat_at) as last_heartbeat_at,
    round(coalesce(sum(
      extract(epoch from (h.last_heartbeat_at - h.first_heartbeat_at)) / 60 + 0.5
    ) filter (where h.last_heartbeat_at >= p_since and h.last_heartbeat_at < p_until), 0))::integer as total_minutes,
    count(*) filter (where h.last_heartbeat_at >= p_since and h.last_heartbeat_at < p_until)::integer as session_count
  from public.user_activity_heartbeats h
  where public.is_admin(auth.uid())
  group by h.user_id;
$$;

comment on function public.admin_user_activity(timestamptz, timestamptz) is
  'Last known heartbeat (for deriving "online": < 90s ago) + aggregated time '
  'spent between p_since and p_until. SECURITY DEFINER, internal is_admin() '
  'guard.';

revoke execute on function public.admin_user_activity(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_user_activity(timestamptz, timestamptz) to authenticated;
