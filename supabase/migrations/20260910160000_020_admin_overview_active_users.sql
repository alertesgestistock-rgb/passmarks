-- =============================================================================
-- Adds two presence-based numbers to admin_dashboard_overview, using the
-- heartbeat system from 20260910140000_018_activity_heartbeats.sql:
--
--   active_users : distinct users with at least one heartbeat SESSION whose
--                  last_heartbeat_at falls inside [p_from, p_to] — follows
--                  the date-range filter, like signups/revenue.
--   online_now   : distinct users with a heartbeat in the last 90s — this one
--                  deliberately ignores p_from/p_to entirely (a user active
--                  right now must show as online no matter which period is
--                  selected, per the product decision made 2026-09-10).
--
-- CREATE OR REPLACE keeps the same signature, so nothing else needs to
-- change (AdminOverviewTab.jsx just starts reading the two new fields).
--
-- ⚠️ PAS ENCORE EXÉCUTÉ EN BASE. À lancer par l'utilisateur lui-même via :
--   npm run supabase -- db query --linked --file "C:/Users/user/Documents/PassMark/Passmark_App/supabase/migrations/20260910160000_020_admin_overview_active_users.sql"
-- Requires 20260910140000_018 (user_activity_heartbeats) to exist first.
-- =============================================================================

create or replace function public.admin_dashboard_overview(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := coalesce(p_from, now() - interval '30 days');
  v_to   timestamptz := coalesce(p_to, now());
  v_users_total int;
  v_new_users int;
  v_revenue_xaf numeric;
  v_transactions int;
  v_paying_users int;
  v_content_created int;
  v_converted_signups int;
  v_active_users int;
  v_online_now int;
  v_daily jsonb;
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  select count(*) into v_users_total from public.profiles;
  select count(*) into v_new_users from public.profiles where created_at >= v_from and created_at < v_to;

  select coalesce(sum(amount_paid), 0), count(*), count(distinct user_id)
    into v_revenue_xaf, v_transactions, v_paying_users
  from public.token_purchases
  where status = 'confirmed' and created_at >= v_from and created_at < v_to;

  select coalesce(sum((stats->>'quizzesCompleted')::int), 0) into v_content_created
  from public.profiles where updated_at >= v_from and updated_at < v_to;
  v_content_created := v_content_created + (
    select count(*) from public.conversations where created_at >= v_from and created_at < v_to
  );

  select count(*) into v_converted_signups
  from public.profiles p
  where p.created_at >= v_from and p.created_at < v_to
    and exists (select 1 from public.token_purchases tp where tp.user_id = p.id and tp.status = 'confirmed');

  -- Follows the period filter.
  select count(distinct user_id) into v_active_users
  from public.user_activity_heartbeats
  where last_heartbeat_at >= v_from and last_heartbeat_at < v_to;

  -- Deliberately ignores p_from/p_to — "online now" is always real-time.
  select count(distinct user_id) into v_online_now
  from public.user_activity_heartbeats
  where last_heartbeat_at >= now() - interval '90 seconds';

  select jsonb_agg(jsonb_build_object('date', day, 'signups', signups, 'revenue_xaf', revenue_xaf) order by day)
    into v_daily
  from (
    select d::date as day,
      (select count(*) from public.profiles p where p.created_at::date = d::date) as signups,
      (select coalesce(sum(tp.amount_paid), 0) from public.token_purchases tp
        where tp.status = 'confirmed' and tp.created_at::date = d::date) as revenue_xaf
    from generate_series(date_trunc('day', v_from), date_trunc('day', v_to), interval '1 day') d
  ) days;

  return jsonb_build_object(
    'users_total', v_users_total,
    'new_users', v_new_users,
    'revenue_xaf', v_revenue_xaf,
    'transactions', v_transactions,
    'paying_users', v_paying_users,
    'content_created', v_content_created,
    'active_users', v_active_users,
    'online_now', v_online_now,
    'shares', 0, -- pas de fonctionnalité de partage dans PassMark
    'converted_signups', v_converted_signups,
    'conversion_rate', case when v_new_users > 0 then round(v_converted_signups::numeric / v_new_users * 100, 1) else 0 end,
    'unconverted_currencies', '[]'::jsonb, -- une seule devise (XAF) chez PassMark
    'daily', coalesce(v_daily, '[]'::jsonb)
  );
end;
$$;
