-- ============================================================================
-- Holiday checklist items table
-- ============================================================================

create table if not exists holiday_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  category    text not null check (category in ('documents', 'bagages', 'maison', 'transport', 'enfants', 'divers')),
  checked     boolean not null default false,
  priority    text not null default 'normale' check (priority in ('haute', 'normale', 'basse')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table holiday_items enable row level security;

create policy "users manage own holiday items"
  on holiday_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
