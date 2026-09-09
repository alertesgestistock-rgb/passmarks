-- telegram_group_threads — one persistent conversation per (user, Telegram
-- group chat), separate from profiles.telegram_active_conversation_id (which
-- tracks the user's private-chat thread only). Without this, a single global
-- "active conversation" per user bled across every group and DM the user
-- wrote in — someone picking up a group question 3 days later would land in
-- whatever unrelated conversation was last active anywhere else.
--
-- Written by the bot's service-role client only; never read/written by the
-- browser, so RLS stays default-deny (no policies) rather than exposing it
-- to PostgREST for nothing.
create table if not exists public.telegram_group_threads (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  chat_id         bigint not null,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  updated_at      timestamptz not null default now(),
  primary key (user_id, chat_id)
);

alter table public.telegram_group_threads enable row level security;

comment on table public.telegram_group_threads is
  'Per-(user, Telegram group) active conversation for the bot — mirrors profiles.telegram_active_conversation_id but scoped to one group instead of being global. Service-role only.';
