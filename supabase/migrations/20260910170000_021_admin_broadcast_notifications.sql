-- =============================================================================
-- Admin-authored, targeted notifications — new "Broadcast" tab in /boss.
--
-- Two new tables:
--   notifications    : server-backed inbox, read by the existing bell
--                       (components/NotificationCenter.jsx) ALONGSIDE the
--                       pre-existing localStorage notifications — the two
--                       systems coexist on purpose (product decision
--                       2026-09-10): localStorage keeps the client-only
--                       reminders (streak, exam countdown, ...), this table
--                       carries anything server-triggered — starting with
--                       admin broadcasts, open to other server events later.
--   admin_broadcasts : one row per broadcast sent, for the tab's history —
--                       what was said, to whom (filters), how many got it.
--
-- Targeting filters (p_filters jsonb, all optional/nullable):
--   has_phone       boolean  -- true = only users with a phone on file
--   level           text     -- 'O Level' | 'A Level'
--   min_tokens      integer  -- token_wallets.balance >=
--   max_tokens      integer  -- token_wallets.balance <=
--   telegram_linked boolean  -- true = only users with a linked Telegram account
--
-- ⚠️ PAS ENCORE EXÉCUTÉ EN BASE. À lancer par l'utilisateur lui-même via :
--   npm run supabase -- db query --linked --file "C:/Users/user/Documents/PassMark/Passmark_App/supabase/migrations/20260910170000_021_admin_broadcast_notifications.sql"
-- Requires 20260909180000_015 (is_admin).
-- =============================================================================

-- ── 1. notifications (server-backed inbox) ──────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  source text not null default 'admin_broadcast',
  action text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

comment on table public.notifications is
  'Server-backed notification inbox, read by NotificationCenter.jsx alongside '
  'the pre-existing localStorage notifications (coexist by design, see '
  'migration header). Written by admin_broadcast_notification() for now; open '
  'to other server-triggered notifications later.';

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "users_select_own_notifications" on public.notifications;
create policy "users_select_own_notifications"
  on public.notifications for select using (auth.uid() = user_id);

-- Only read_at is meant to change client-side (marking as read); there is no
-- column-level RLS in Postgres, so this trusts the client not to rewrite its
-- own title/body — low-stakes (it only affects what that one user sees in
-- their own inbox), consistent with how paper_views/heartbeats are guarded.
drop policy if exists "users_update_own_notifications" on public.notifications;
create policy "users_update_own_notifications"
  on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users_delete_own_notifications" on public.notifications;
create policy "users_delete_own_notifications"
  on public.notifications for delete using (auth.uid() = user_id);

-- No insert policy: rows are only ever written by SECURITY DEFINER RPCs
-- (admin_broadcast_notification), never a direct client insert.

-- ── 2. admin_broadcasts (history log) ────────────────────────────────────────
create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  filters jsonb not null default '{}'::jsonb,
  recipient_count integer not null default 0,
  telegram_sent_count integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.admin_broadcasts enable row level security;

drop policy if exists "admins_select_broadcasts" on public.admin_broadcasts;
create policy "admins_select_broadcasts"
  on public.admin_broadcasts for select using (public.is_admin(auth.uid()));

-- No insert/update policy: written only by the RPCs below.

-- ── 3. Preview audience size (dry run, no writes) ───────────────────────────
create or replace function public.admin_count_broadcast_recipients(p_filters jsonb default '{}'::jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  select count(*) into v_count
  from public.profiles p
  left join public.token_wallets w on w.user_id = p.id
  where (p_filters->>'has_phone' is null or (p.phone is not null) = (p_filters->>'has_phone')::boolean)
    and (p_filters->>'level' is null or p.level = p_filters->>'level')
    and (p_filters->>'min_tokens' is null or coalesce(w.balance, 0) >= (p_filters->>'min_tokens')::int)
    and (p_filters->>'max_tokens' is null or coalesce(w.balance, 0) <= (p_filters->>'max_tokens')::int)
    and (p_filters->>'telegram_linked' is null or (p.telegram_id is not null) = (p_filters->>'telegram_linked')::boolean);

  return v_count;
end;
$$;

-- ── 4. Send: writes notifications + the history row, returns telegram_ids ──
create or replace function public.admin_broadcast_notification(
  p_title text,
  p_body text,
  p_filters jsonb default '{}'::jsonb,
  p_send_telegram boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_broadcast_id uuid;
  v_recipient_count int;
  v_telegram_ids jsonb;
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then
    raise exception 'title_and_body_required';
  end if;

  create temporary table _broadcast_targets on commit drop as
  select p.id as user_id, p.telegram_id
  from public.profiles p
  left join public.token_wallets w on w.user_id = p.id
  where (p_filters->>'has_phone' is null or (p.phone is not null) = (p_filters->>'has_phone')::boolean)
    and (p_filters->>'level' is null or p.level = p_filters->>'level')
    and (p_filters->>'min_tokens' is null or coalesce(w.balance, 0) >= (p_filters->>'min_tokens')::int)
    and (p_filters->>'max_tokens' is null or coalesce(w.balance, 0) <= (p_filters->>'max_tokens')::int)
    and (p_filters->>'telegram_linked' is null or (p.telegram_id is not null) = (p_filters->>'telegram_linked')::boolean);

  select count(*) into v_recipient_count from _broadcast_targets;

  insert into public.notifications (user_id, title, body, source)
  select user_id, p_title, p_body, 'admin_broadcast' from _broadcast_targets;

  select coalesce(jsonb_agg(telegram_id), '[]'::jsonb) into v_telegram_ids
  from _broadcast_targets where telegram_id is not null;

  insert into public.admin_broadcasts (title, body, filters, recipient_count, created_by)
  values (p_title, p_body, p_filters, v_recipient_count, auth.uid())
  returning id into v_broadcast_id;

  return jsonb_build_object(
    'broadcast_id', v_broadcast_id,
    'recipient_count', v_recipient_count,
    'telegram_ids', case when p_send_telegram then v_telegram_ids else '[]'::jsonb end
  );
end;
$$;

-- Called by the admin-broadcast edge function once Telegram sends are done,
-- to record how many actually went through (rate-limited/failed sends excluded).
create or replace function public.admin_update_broadcast_telegram_count(p_broadcast_id uuid, p_sent_count int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;
  update public.admin_broadcasts set telegram_sent_count = p_sent_count where id = p_broadcast_id;
end;
$$;

-- ── 5. History list for the tab ─────────────────────────────────────────────
create or replace function public.admin_list_broadcasts(p_limit int default 20)
returns table (
  id uuid, title text, body text, filters jsonb,
  recipient_count int, telegram_sent_count int,
  created_by_name text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  return query
  select b.id, b.title, b.body, b.filters, b.recipient_count, b.telegram_sent_count, p.name, b.created_at
  from public.admin_broadcasts b
  left join public.profiles p on p.id = b.created_by
  order by b.created_at desc
  limit p_limit;
end;
$$;

revoke execute on function public.admin_count_broadcast_recipients(jsonb) from public, anon;
revoke execute on function public.admin_broadcast_notification(text, text, jsonb, boolean) from public, anon;
revoke execute on function public.admin_update_broadcast_telegram_count(uuid, int) from public, anon;
revoke execute on function public.admin_list_broadcasts(int) from public, anon;
