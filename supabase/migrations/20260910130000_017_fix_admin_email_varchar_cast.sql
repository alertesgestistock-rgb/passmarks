-- =============================================================================
-- Fix: auth.users.email is character varying(255), not text. Three RPCs from
-- 20260910120000_016_admin_dashboard_rpcs.sql declare `email text` in their
-- RETURNS TABLE but select u.email straight from auth.users — Postgres
-- refuses the implicit varchar→text coercion inside RETURNS TABLE (PGRST
-- error 42804 "structure of query does not match function result type"),
-- caught live in the browser console on 2026-09-10 hitting /boss.
-- Fix: cast u.email::text at the three call sites. CREATE OR REPLACE keeps
-- the same signature, so nothing else needs to change.
--
-- ⚠️ PAS ENCORE EXÉCUTÉ EN BASE. À lancer par l'utilisateur lui-même via :
--   npm run supabase -- db query --linked --file "C:/Users/user/Documents/PassMark/Passmark_App/supabase/migrations/20260910130000_017_fix_admin_email_varchar_cast.sql"
-- =============================================================================

create or replace function public.admin_list_users(
  p_search text default null,
  p_level text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  level text,
  exam_month text,
  exam_year text,
  role text,
  phone text,
  phone_country text,
  is_telegram boolean,
  quizzes_completed int,
  papers_read int,
  balance int,
  total_earned int,
  total_spent int,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  return query
  select
    p.id, u.email::text, p.name, p.level, p.exam_month, p.exam_year, p.role,
    p.phone, p.phone_country, (p.telegram_id is not null),
    coalesce((p.stats->>'quizzesCompleted')::int, 0),
    coalesce((p.stats->>'papersRead')::int, 0),
    coalesce(w.balance, 0), coalesce(w.total_earned, 0), coalesce(w.total_spent, 0),
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.token_wallets w on w.user_id = p.id
  where (p_level is null or p.level = p_level)
    and (p_search is null or p.name ilike '%'||p_search||'%' or u.email ilike '%'||p_search||'%' or p.phone ilike '%'||p_search||'%')
  order by p.created_at desc
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.admin_token_users(
  p_search text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  balance int,
  total_earned int,
  total_spent int,
  pending_cost_usd numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  return query
  select p.id, u.email::text, p.name, w.balance, w.total_earned, w.total_spent, w.pending_cost_usd
  from public.token_wallets w
  join public.profiles p on p.id = w.user_id
  join auth.users u on u.id = p.id
  where p_search is null or p.name ilike '%'||p_search||'%' or u.email ilike '%'||p_search||'%'
  order by w.balance desc
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.admin_recent_activity(p_from timestamptz, p_to timestamptz, p_limit int default 30)
returns table (kind text, email text, detail text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := coalesce(p_from, now() - interval '30 days');
  v_to   timestamptz := coalesce(p_to, now());
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  return query
  (
    select 'conversation'::text, u.email::text, coalesce(c.title, 'Untitled conversation'), c.created_at
    from public.conversations c join auth.users u on u.id = c.user_id
    where c.created_at >= v_from and c.created_at < v_to
    order by c.created_at desc limit p_limit
  )
  union all
  (
    select 'paper_view'::text, u.email::text, gp.title, pv.viewed_at
    from public.paper_views pv
    join auth.users u on u.id = pv.user_id
    join public.gce_papers gp on gp.id = pv.paper_id
    where pv.viewed_at >= v_from and pv.viewed_at < v_to
    order by pv.viewed_at desc limit p_limit
  )
  order by created_at desc
  limit p_limit;
end;
$$;
