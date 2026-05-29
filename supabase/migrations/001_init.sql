-- PassMark: initial schema

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  level       text not null default 'A Level',
  subjects    text[] not null default '{}',
  exam_month  text,
  exam_year   text,
  api_key     text,
  stats       jsonb not null default '{"questionsSolved":0,"papersRead":0,"quizzesCompleted":0,"totalScore":0,"bySubject":{}}',
  recent_activity jsonb not null default '[]',
  chat_history    jsonb not null default '[]',
  quiz_history    jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "users_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "users_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
