-- ============================================================================
-- Holiday trips table — each trip has its own checklist
-- ============================================================================

create table if not exists holiday_trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  emoji       text not null default '✈️',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table holiday_trips enable row level security;

create policy "users manage own holiday trips"
  on holiday_trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add trip_id to existing items (nullable for backward compat with existing data)
alter table holiday_items add column if not exists trip_id uuid references holiday_trips(id) on delete cascade;
