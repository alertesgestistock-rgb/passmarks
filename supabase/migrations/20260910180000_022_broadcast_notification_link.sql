-- =============================================================================
-- Adds an optional link to broadcast notifications (product request
-- 2026-09-10): the composer gets a separate "Link" field from the message
-- body — on Telegram it renders as a real inline button (not just a raw URL
-- pasted into the text), and in-app the notification detail modal shows the
-- full text with the link as its own clickable action underneath.
--
-- ⚠️ PAS ENCORE EXÉCUTÉ EN BASE. À lancer par l'utilisateur lui-même via :
--   npm run supabase -- db query --linked --file "C:/Users/user/Documents/PassMark/Passmark_App/supabase/migrations/20260910180000_022_broadcast_notification_link.sql"
-- Requires 20260910170000_021 (notifications, admin_broadcasts).
-- =============================================================================

alter table public.notifications add column if not exists link text;
alter table public.admin_broadcasts add column if not exists link text;

-- Both function signatures below actually change (a new parameter for
-- admin_broadcast_notification, a new returned column for
-- admin_list_broadcasts) — CREATE OR REPLACE cannot alter an argument list or
-- a RETURNS TABLE column set, it would just create a second overload sitting
-- next to the old one (exactly the bug documented in Raconty's own
-- 20260809000008_admin_period_filters_fix.sql). Drop the old signatures first.
drop function if exists public.admin_broadcast_notification(text, text, jsonb, boolean);
drop function if exists public.admin_list_broadcasts(int);

create or replace function public.admin_broadcast_notification(
  p_title text,
  p_body text,
  p_filters jsonb default '{}'::jsonb,
  p_send_telegram boolean default false,
  p_link text default null
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

  insert into public.notifications (user_id, title, body, source, link)
  select user_id, p_title, p_body, 'admin_broadcast', p_link from _broadcast_targets;

  select coalesce(jsonb_agg(telegram_id), '[]'::jsonb) into v_telegram_ids
  from _broadcast_targets where telegram_id is not null;

  insert into public.admin_broadcasts (title, body, filters, recipient_count, created_by, link)
  values (p_title, p_body, p_filters, v_recipient_count, auth.uid(), p_link)
  returning id into v_broadcast_id;

  return jsonb_build_object(
    'broadcast_id', v_broadcast_id,
    'recipient_count', v_recipient_count,
    'telegram_ids', case when p_send_telegram then v_telegram_ids else '[]'::jsonb end
  );
end;
$$;

create or replace function public.admin_list_broadcasts(p_limit int default 20)
returns table (
  id uuid, title text, body text, link text, filters jsonb,
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
  select b.id, b.title, b.body, b.link, b.filters, b.recipient_count, b.telegram_sent_count, p.name, b.created_at
  from public.admin_broadcasts b
  left join public.profiles p on p.id = b.created_by
  order by b.created_at desc
  limit p_limit;
end;
$$;

revoke execute on function public.admin_broadcast_notification(text, text, jsonb, boolean, text) from public, anon;
revoke execute on function public.admin_list_broadcasts(int) from public, anon;
