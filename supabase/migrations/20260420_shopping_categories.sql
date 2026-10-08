-- ============================================================================
-- FAMILY HUB — Catégories de courses (rayons) ordonnables + emojis
-- À exécuter dans le SQL Editor Supabase.
-- L'application fonctionne aussi avant cette migration (les catégories sont
-- simplement absentes), mais l'ordre des rayons nécessite ces tables.
-- ============================================================================

create table if not exists shopping_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name_fr text not null,
  name_en text not null,
  icon text default '🛒',
  sort_order integer default 0,
  created_at timestamptz default now()
);

create index if not exists shopping_categories_user_id_idx on shopping_categories(user_id);

alter table shopping_categories enable row level security;

drop policy if exists "Users manage own shopping_categories" on shopping_categories;
create policy "Users manage own shopping_categories" on shopping_categories
  for all using (auth.uid() = user_id);

-- Catégorie par défaut d'un ingrédient (détermine son rayon dans la liste)
alter table ingredients add column if not exists category_id uuid
  references shopping_categories(id) on delete set null;
alter table ingredients add column if not exists icon text;

-- Catégorie propre à un article (prioritaire sur celle de l'ingrédient,
-- utile pour les articles saisis manuellement)
alter table shopping_items add column if not exists category_id uuid
  references shopping_categories(id) on delete set null;

-- Emoji pour les féculents
alter table bases add column if not exists icon text;
