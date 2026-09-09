-- =============================================================================
-- Upgrades the single "link" (URL only) added in migration 022 into a
-- repeatable list of buttons — each with its OWN label text and URL, as many
-- as the admin wants (product request 2026-09-10, following up on 022: "the
-- link" actually meant a labelled button, and more than one should be
-- possible — like the multiple reply buttons Telegram itself shows under
-- /history in the bot).
--
-- notifications.link / admin_broadcasts.link (single text URL) are kept
-- as-is for any historical row (1 broadcast + its notifications already
-- exist) but are no longer written going forward — the new `links` jsonb
-- column holds an array of {label, url} objects. Existing rows are
-- backfilled into that shape with a generic "Open link" label so the
-- history tab and old notifications keep working under the new column.
--
-- ⚠️ PAS ENCORE EXÉCUTÉ EN BASE. À lancer par l'utilisateur lui-même via :
--   npm run supabase -- db query --linked --file "C:/Users/user/Documents/PassMark/Passmark_App/supabase/migrations/20260910190000_023_broadcast_multiple_link_buttons.sql"
-- Requires 20260910180000_022 (notifications.link, admin_broadcasts.link).
-- =============================================================================

alter table public.notifications add column if not exists links jsonb not null default '[]'::jsonb;
alter table public.admin_broadcasts add column if not exists links jsonb not null default '[]'::jsonb;

update public.notifications
set links = jsonb_build_array(jsonb_build_object('label', 'Open link', 'url', link))
where link is not null and links = '[]'::jsonb;

update public.admin_broadcasts
set links = jsonb_build_array(jsonb_build_object('label', 'Open link', 'url', link))
where link is not null and links = '[]'::jsonb;

comment on column public.notifications.link is
  'Deprecated 2026-09-10 by the `links` array (label + url, repeatable) — kept for historical rows written before this migration, no longer written.';
comment on column public.admin_broadcasts.link is
  'Deprecated 2026-09-10 by the `links` array (label + url, repeatable) — kept for historical rows written before this migration, no longer written.';

-- Signature changes again (p_link text -> p_links jsonb array; a returned
-- column changes shape) — same reasoning as 022: drop before recreate.
drop function if exists public.admin_broadcast_notification(text, text, jsonb, boolean, text);
drop function if exists public.admin_list_broadcasts(int);

-- p_links shape: [{"label": "Buy tokens", "url": "https://..."}, ...] — order
-- preserved, becomes one Telegram inline-keyboard row per entry (see the
-- admin-broadcast edge function) and one button per entry in the in-app
-- notification detail modal.
create or replace function public.admin_broadcast_notification(
  p_title text,
  p_body text,
  p_filters jsonb default '{}'::jsonb,
  p_send_telegram boolean default false,
  p_links jsonb default '[]'::jsonb
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
  if jsonb_typeof(p_links) is distinct from 'array' then
    raise exception 'links_must_be_an_array';
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

  insert into public.notifications (user_id, title, body, source, links)
  select user_id, p_title, p_body, 'admin_broadcast', p_links from _broadcast_targets;

  select coalesce(jsonb_agg(telegram_id), '[]'::jsonb) into v_telegram_ids
  from _broadcast_targets where telegram_id is not null;

  insert into public.admin_broadcasts (title, body, filters, recipient_count, created_by, links)
  values (p_title, p_body, p_filters, v_recipient_count, auth.uid(), p_links)
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
  id uuid, title text, body text, links jsonb, filters jsonb,
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
  select b.id, b.title, b.body, b.links, b.filters, b.recipient_count, b.telegram_sent_count, p.name, b.created_at
  from public.admin_broadcasts b
  left join public.profiles p on p.id = b.created_by
  order by b.created_at desc
  limit p_limit;
end;
$$;

revoke execute on function public.admin_broadcast_notification(text, text, jsonb, boolean, jsonb) from public, anon;
revoke execute on function public.admin_list_broadcasts(int) from public, anon;
