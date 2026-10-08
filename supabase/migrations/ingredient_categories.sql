-- Ingredient categories table
create table if not exists ingredient_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name_fr text not null,
  name_en text not null,
  icon text default '🏷️',
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table ingredient_categories enable row level security;

create policy "users manage own ingredient categories"
  on ingredient_categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add category_id to ingredients
alter table ingredients add column if not exists category_id uuid references ingredient_categories(id) on delete set null;
