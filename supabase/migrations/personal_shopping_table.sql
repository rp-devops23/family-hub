-- ============================================================================
-- Personal shopping items (clothes/accessories + gifts)
-- Separate from recipe shopping list which uses shopping_items
-- ============================================================================

create table if not exists personal_shopping_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  category      text not null check (category in ('clothing', 'gift')),
  -- clothing fields
  item_type     text,
  for_whom      text,
  description   text,
  -- gift fields
  occasion      text,
  deadline      date,
  budget        numeric(10, 2),
  -- common
  checked       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists personal_shopping_items_user_id_idx on personal_shopping_items(user_id);

alter table personal_shopping_items enable row level security;

create policy "users manage own personal shopping items"
  on personal_shopping_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
