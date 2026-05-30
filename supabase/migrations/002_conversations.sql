-- Conversations: replace chat_history JSONB with proper relational tables

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  content_type    text not null default 'text',
  created_at      timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "users_select_own_conversations" on public.conversations
  for select using (auth.uid() = user_id);
create policy "users_insert_own_conversations" on public.conversations
  for insert with check (auth.uid() = user_id);
create policy "users_update_own_conversations" on public.conversations
  for update using (auth.uid() = user_id);
create policy "users_delete_own_conversations" on public.conversations
  for delete using (auth.uid() = user_id);

create policy "users_select_own_messages" on public.messages
  for select using (
    exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
create policy "users_insert_own_messages" on public.messages
  for insert with check (
    exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.handle_updated_at();
