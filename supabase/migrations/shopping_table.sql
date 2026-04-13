-- ============================================================================
-- Shopping items table
-- ============================================================================

create table if not exists shopping_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  category      text not null check (category in ('groceries', 'gift')),
  -- groceries fields
  aisle         text,                          -- Alimentation, Maison, Pharmacie, Beauté, Autre
  quantity      text,
  -- gift fields
  for_whom      text,
  deadline      date,
  budget        numeric(10,2),
  link          text,
  -- common
  checked       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table shopping_items enable row level security;

create policy "users manage own shopping items"
  on shopping_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
