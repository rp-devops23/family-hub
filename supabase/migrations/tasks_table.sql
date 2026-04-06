-- ============================================================================
-- TASKS — Corvées & Travaux
-- Run this in your Supabase SQL editor
-- ============================================================================

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null check (category in ('chore', 'work')),
  name text not null,
  done boolean not null default false,
  expires_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tasks_user_id_idx on tasks(user_id);

alter table tasks enable row level security;

create policy "Users manage own tasks" on tasks
  for all using (auth.uid() = user_id);
