-- Adds a detailed, row-by-row referral listing for the admin dashboard's new
-- "Referrals" tab (who invited whom, when, converted or not, tokens earned
-- by each side) — see AdminReferralsTab.jsx.
--
-- Also fixes a real bug found while building this: admin_referral_summary's
-- "tokens_paid_to_referrers" stat sums token_transactions.amount filtered on
-- action_type = 'referral_signup_bonus', but credit_tokens() (called by
-- apply_referral for BOTH the referrer's +10 and the referred's +5) always
-- hardcodes action_type = 'purchase' — that enum value is never actually
-- written for a referral bonus, so the stat has always silently returned 0.
-- Since apply_referral's reward amounts are fixed constants (10 / 5), the
-- fix computes the total directly from the referrals table instead of
-- trying to filter transactions by an action_type that doesn't apply.

create or replace function public.admin_referral_details(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_from timestamptz := coalesce(p_from, now() - interval '30 days');
  v_to   timestamptz := coalesce(p_to, now());
  v_rows jsonb;
begin
  if not public.is_admin(auth.uid()) then raise exception 'not_admin'; end if;

  select jsonb_agg(row_data order by referred_at desc)
    into v_rows
  from (
    select jsonb_build_object(
      'referrer_id', rp.id,
      'referrer_name', rp.name,
      'referrer_email', case when ru.email like 'tg-%@telegram.passmark.internal' then null else ru.email end,
      'referrer_telegram_linked', rp.telegram_id is not null,
      'referred_id', dp.id,
      'referred_name', dp.name,
      'referred_email', case when du.email like 'tg-%@telegram.passmark.internal' then null else du.email end,
      'referred_telegram_linked', dp.telegram_id is not null,
      'referred_at', r.created_at,
      'converted', exists (
        select 1 from token_purchases tp
        where tp.user_id = r.referred_id and tp.status = 'confirmed'
      ),
      'tokens_to_referrer', 10,
      'tokens_to_referred', 5
    ) as row_data,
    r.created_at as referred_at
    from referrals r
    join profiles rp on rp.id = r.referrer_id
    join auth.users ru on ru.id = rp.id
    join profiles dp on dp.id = r.referred_id
    join auth.users du on du.id = dp.id
    where r.created_at >= v_from and r.created_at < v_to
  ) rows;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- Fix: compute from referrals × the fixed 10-token reward instead of a
-- token_transactions filter that never matches (see comment above).
create or replace function public.admin_referral_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
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
    'tokens_paid_to_referrers', 10 * (select count(*) from public.referrals where created_at >= v_from and created_at < v_to),
    'top_referrers', coalesce(v_top_referrers, '[]'::jsonb),
    'acquisition_breakdown', coalesce(v_acquisition, '[]'::jsonb)
  );
end;
$$;
