-- =============================================================================
-- RPC admin pour /boss, écrites pour le VRAI schéma PassMark (pas un copier-
-- coller des RPC Raconty — vérifié via mcp__supabase__list_tables le
-- 2026-09-10 : pas de `plan`/abonnement, pas de multi-bucket de tokens, pas
-- de génération vidéo/image, pas de heartbeat de présence, pas de table
-- promo_codes). Chaque fonction est SECURITY DEFINER + garde is_admin(auth.uid())
-- en première ligne — pas besoin de policies RLS supplémentaires sur
-- token_wallets/token_transactions/token_purchases pour que l'admin y lise.
--
-- ⚠️ PAS ENCORE EXÉCUTÉ EN BASE. À lancer par l'utilisateur lui-même via :
--   npm run supabase -- db query --linked --file "C:/Users/user/Documents/PassMark/Passmark_App/supabase/migrations/20260910120000_016_admin_dashboard_rpcs.sql"
-- Dépend de 20260909180000_015_admin_role_on_profiles.sql (is_admin, role) —
-- doit être appliquée avant celle-ci.
-- =============================================================================

-- ── 1. Overview ──────────────────────────────────────────────────────────
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
  v_daily jsonb;
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  select count(*) into v_users_total from public.profiles;
  select count(*) into v_new_users from public.profiles where created_at >= v_from and created_at < v_to;

  select coalesce(sum(amount_paid), 0), count(*), count(distinct user_id)
    into v_revenue_xaf, v_transactions, v_paying_users
  from public.token_purchases
  where status = 'confirmed' and created_at >= v_from and created_at < v_to;

  -- "Contenu créé" côté PassMark = activité pédagogique réelle : quiz
  -- terminés (stats jsonb, pas de table événement dédiée) + conversations
  -- IA Tutor démarrées, sur la période.
  select coalesce(sum((stats->>'quizzesCompleted')::int), 0) into v_content_created
  from public.profiles where updated_at >= v_from and updated_at < v_to;
  v_content_created := v_content_created + (
    select count(*) from public.conversations where created_at >= v_from and created_at < v_to
  );

  select count(*) into v_converted_signups
  from public.profiles p
  where p.created_at >= v_from and p.created_at < v_to
    and exists (select 1 from public.token_purchases tp where tp.user_id = p.id and tp.status = 'confirmed');

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
    'shares', 0, -- pas de fonctionnalité de partage dans PassMark
    'converted_signups', v_converted_signups,
    'conversion_rate', case when v_new_users > 0 then round(v_converted_signups::numeric / v_new_users * 100, 1) else 0 end,
    'unconverted_currencies', '[]'::jsonb, -- une seule devise (XAF) chez PassMark
    'daily', coalesce(v_daily, '[]'::jsonb)
  );
end;
$$;

-- ── 2. Users ─────────────────────────────────────────────────────────────
create or replace function public.admin_count_users(p_search text default null, p_level text default null)
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
  join auth.users u on u.id = p.id
  where (p_level is null or p.level = p_level)
    and (p_search is null or p.name ilike '%'||p_search||'%' or u.email ilike '%'||p_search||'%' or p.phone ilike '%'||p_search||'%');

  return v_count;
end;
$$;

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

-- ── 3. Tokens ────────────────────────────────────────────────────────────
create or replace function public.admin_token_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := coalesce(p_from, now() - interval '30 days');
  v_to   timestamptz := coalesce(p_to, now());
  v_total_balance int;
  v_total_earned int;
  v_total_spent int;
  v_period_earned int;
  v_period_spent int;
  v_by_action jsonb;
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  select coalesce(sum(balance), 0), coalesce(sum(total_earned), 0), coalesce(sum(total_spent), 0)
    into v_total_balance, v_total_earned, v_total_spent
  from public.token_wallets;

  select coalesce(sum(amount) filter (where amount > 0), 0), coalesce(-sum(amount) filter (where amount < 0), 0)
    into v_period_earned, v_period_spent
  from public.token_transactions
  where created_at >= v_from and created_at < v_to;

  select jsonb_agg(jsonb_build_object('action', action_type, 'net', net) order by net desc)
    into v_by_action
  from (
    select action_type, sum(amount) as net
    from public.token_transactions
    where created_at >= v_from and created_at < v_to
    group by action_type
  ) grouped;

  return jsonb_build_object(
    'total_balance', v_total_balance,
    'total_earned', v_total_earned,
    'total_spent', v_total_spent,
    'period_earned', v_period_earned,
    'period_spent', v_period_spent,
    'movements_by_action', coalesce(v_by_action, '[]'::jsonb)
  );
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

-- ── 4. Content ───────────────────────────────────────────────────────────
create or replace function public.admin_content_totals(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := coalesce(p_from, now() - interval '30 days');
  v_to   timestamptz := coalesce(p_to, now());
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  return jsonb_build_object(
    'conversations_started', (select count(*) from public.conversations where created_at >= v_from and created_at < v_to),
    'messages_sent', (select count(*) from public.messages m join public.conversations c on c.id = m.conversation_id where m.created_at >= v_from and m.created_at < v_to and m.role = 'user'),
    'quizzes_completed', coalesce((select sum((stats->>'quizzesCompleted')::int) from public.profiles where updated_at >= v_from and updated_at < v_to), 0),
    'papers_viewed', (select count(*) from public.paper_views where viewed_at >= v_from and viewed_at < v_to),
    'calendar_events_created', (select count(*) from public.calendar_events where created_at >= v_from and created_at < v_to),
    'ai_tokens_spent', coalesce((select -sum(amount) from public.token_transactions where amount < 0 and action_type in ('message','tag_question','image','pdf','message_with_context','voice') and created_at >= v_from and created_at < v_to), 0)
  );
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

-- ── 5. Marketing / referrals ─────────────────────────────────────────────
create or replace function public.admin_referral_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := coalesce(p_from, now() - interval '30 days');
  v_to   timestamptz := coalesce(p_to, now());
  v_top_referrers jsonb;
  v_acquisition jsonb;
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  select jsonb_agg(jsonb_build_object('email', email, 'name', name, 'referred_count', referred_count) order by referred_count desc)
    into v_top_referrers
  from (
    select u.email, p.name, count(*) as referred_count
    from public.referrals r
    join public.profiles p on p.id = r.referrer_id
    join auth.users u on u.id = p.id
    group by u.email, p.name
    order by count(*) desc
    limit 20
  ) top;

  select jsonb_agg(jsonb_build_object('source', coalesce(self_reported_acquisition_source, 'unknown'), 'count', cnt) order by cnt desc)
    into v_acquisition
  from (
    select self_reported_acquisition_source, count(*) as cnt
    from public.profiles
    group by self_reported_acquisition_source
  ) src;

  return jsonb_build_object(
    'total_referrals', (select count(*) from public.referrals),
    'new_referrals', (select count(*) from public.referrals where created_at >= v_from and created_at < v_to),
    'tokens_paid_to_referrers', coalesce((select sum(amount) from public.token_transactions where action_type = 'referral_signup_bonus' and created_at >= v_from and created_at < v_to), 0),
    'top_referrers', coalesce(v_top_referrers, '[]'::jsonb),
    'acquisition_breakdown', coalesce(v_acquisition, '[]'::jsonb)
  );
end;
$$;

-- ── Locked down like every other admin RPC: SECURITY DEFINER + internal
--    is_admin() check is the real gate, but revoking the default PUBLIC/anon
--    grant means a signed-out request can't even attempt the call.
revoke execute on function public.admin_dashboard_overview(timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_count_users(text, text) from public, anon;
revoke execute on function public.admin_list_users(text, text, int, int) from public, anon;
revoke execute on function public.admin_token_dashboard(timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_token_users(text, int, int) from public, anon;
revoke execute on function public.admin_content_totals(timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_recent_activity(timestamptz, timestamptz, int) from public, anon;
revoke execute on function public.admin_referral_summary(timestamptz, timestamptz) from public, anon;
