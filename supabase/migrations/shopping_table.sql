-- ============================================================================
-- Shopping items table (clothes/accessories to buy + gifts to offer)
-- ============================================================================

create table if not exists shopping_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  category      text not null check (category in ('clothing', 'gift')),
  -- clothing fields
  item_type     text,    -- T-shirt, Pull, Veste, Pantalon, Robe, Chaussures, Accessoire…
  for_whom      text,    -- family member name
  description   text,    -- size, color, brand, store, etc.
  -- gift fields
  occasion      text,    -- Anniversaire, Noël, Fête des Mères…
  deadline      date,
  budget        numeric(10, 2),
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
