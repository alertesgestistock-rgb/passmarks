-- Telegram bot support: account linking, per-user active conversation, and the
-- indexes the bot's hot-path queries (and the web app's existing ones) need.
--
-- Every statement is idempotent, so this is safe to paste into the Supabase SQL
-- Editor even though telegram_id was already added there by hand earlier.

-- ── 1. Account linking ──────────────────────────────────────────────────────
-- Links a Telegram user to their PassMark profile. Set either by telegram-login
-- (Mini App "Continue with Telegram") or telegram-link ("I already have an
-- account"). Nullable: web-only users never have one.
alter table public.profiles
  add column if not exists telegram_id text unique;

-- ── 2. Active conversation for the bot chat ─────────────────────────────────
-- A Telegram chat has no page/URL to hold "which conversation am I in", unlike
-- the web app which keeps it in component state. This column is that pointer.
-- Cleared by /new; set by /history selection or by starting a fresh question.
-- ON DELETE SET NULL so deleting a conversation in the web app just drops the
-- pointer instead of blocking the delete.
alter table public.profiles
  add column if not exists telegram_active_conversation_id uuid
  references public.conversations(id) on delete set null;

-- ── 3. Indexes for queries that currently do full table scans ───────────────

-- Rate limiting counts a user's billed AI actions in the last rolling minute,
-- on every single AI request from both web and bot. token_transactions only
-- had its primary key, so this ran as a sequential scan over a table that grows
-- with every question ever asked.
create index if not exists token_transactions_user_created_idx
  on public.token_transactions (user_id, created_at desc);

-- Loading a conversation's recent turns — done by the bot for context on each
-- question, and by the web app every time a conversation is opened.
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- Listing a user's conversations, newest first: /history in the bot and the
-- conversation sidebar in the web app.
create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);
