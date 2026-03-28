-- ============================================================================
-- FAMILY HUB - Supabase Schema
-- Run this in your new Supabase project SQL editor
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- FINANCE APP TABLES
-- ============================================================================

create table accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  bank text,
  iban text,
  color text default '#00A3E0',
  is_default boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name_fr text not null,
  name_en text not null,
  icon text,
  color text default '#636E72',
  sort_order integer default 0,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table subcategories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  name_fr text not null,
  name_en text not null,
  sort_order integer default 0,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  amount numeric(12,2) not null,
  description text,
  account_id uuid references accounts(id) on delete set null,
  subcategory_id uuid references subcategories(id) on delete set null,
  notes text,
  recurring_template_id uuid references recurring_templates(id) on delete set null,
  attachment_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount_limit numeric(12,2) not null,
  period text default 'monthly',
  color text default '#00A3E0',
  icon text default '💰',
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table budget_categories (
  budget_id uuid references budgets(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  primary key (budget_id, category_id)
);

create table budget_subcategories (
  budget_id uuid references budgets(id) on delete cascade not null,
  subcategory_id uuid references subcategories(id) on delete cascade not null,
  primary key (budget_id, subcategory_id)
);

create table recurring_templates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  description text not null,
  amount numeric(12,2) not null,
  frequency text not null default 'monthly',
  day_of_month integer default 1,
  day_of_week integer default 1,
  month integer default 0,
  account_id uuid references accounts(id) on delete set null,
  subcategory_id uuid references subcategories(id) on delete set null,
  start_date date,
  end_date date,
  notes text,
  is_active boolean default true,
  month_of_year integer,
  last_skipped_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- RECIPE APP TABLES
-- ============================================================================

-- profiles.id = auth.users.id (not a separate FK)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  language text default 'fr',
  created_at timestamptz default now()
);

create table tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name_fr text not null,
  name_en text not null,
  icon text default '🏷️',
  color text default '#2D5A3D',
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table bases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name_fr text not null,
  name_en text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table cuisines (
  id uuid primary key default uuid_generate_v4(),
  name_fr text not null,
  name_en text not null,
  flag text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table ingredients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name_fr text not null,
  name_en text not null,
  created_at timestamptz default now()
);

create table recipes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  meal_type text default 'main',
  difficulty text default 'medium',
  price_range text default 'medium',
  prep_time_minutes integer,
  notes text,
  seasons text[] default '{}',
  base_id uuid references bases(id) on delete set null,
  cuisine_id uuid references cuisines(id) on delete set null,
  created_at timestamptz default now()
);

create table recipe_tags (
  recipe_id uuid references recipes(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  primary key (recipe_id, tag_id)
);

create table recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade not null,
  ingredient_id uuid references ingredients(id) on delete cascade not null,
  quantity text,
  unit text,
  sort_order integer default 0
);

create table meal_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  recipe_id uuid references recipes(id) on delete cascade not null,
  planned_date date not null,
  created_at timestamptz default now()
);

create table shopping_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  ingredient_id uuid references ingredients(id) on delete set null,
  quantity text,
  unit text,
  checked boolean default false,
  sort_order integer default 0,
  custom_name text,
  count numeric(10,2),
  created_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table accounts enable row level security;
alter table categories enable row level security;
alter table subcategories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table budget_categories enable row level security;
alter table budget_subcategories enable row level security;
alter table recurring_templates enable row level security;
alter table profiles enable row level security;
alter table tags enable row level security;
alter table bases enable row level security;
alter table ingredients enable row level security;
alter table recipes enable row level security;
alter table recipe_tags enable row level security;
alter table recipe_ingredients enable row level security;
alter table meal_plans enable row level security;
alter table shopping_items enable row level security;

create policy "Users manage own accounts" on accounts for all using (auth.uid() = user_id);
create policy "Users manage own categories" on categories for all using (auth.uid() = user_id);
create policy "Users manage own subcategories" on subcategories for all using (auth.uid() = user_id);
create policy "Users manage own transactions" on transactions for all using (auth.uid() = user_id);
create policy "Users manage own budgets" on budgets for all using (auth.uid() = user_id);
create policy "Users manage own budget_categories" on budget_categories for all using (
  exists (select 1 from budgets where budgets.id = budget_categories.budget_id and budgets.user_id = auth.uid())
);
create policy "Users manage own budget_subcategories" on budget_subcategories for all using (
  exists (select 1 from budgets where budgets.id = budget_subcategories.budget_id and budgets.user_id = auth.uid())
);
create policy "Users manage own recurring_templates" on recurring_templates for all using (auth.uid() = user_id);
create policy "Users manage own profiles" on profiles for all using (auth.uid() = id);
create policy "Users manage own tags" on tags for all using (auth.uid() = user_id);
create policy "Users manage own bases" on bases for all using (auth.uid() = user_id);
create policy "Users manage own ingredients" on ingredients for all using (auth.uid() = user_id);
create policy "Users manage own recipes" on recipes for all using (auth.uid() = user_id);
create policy "Users manage own recipe_tags" on recipe_tags for all using (
  exists (select 1 from recipes where recipes.id = recipe_tags.recipe_id and recipes.user_id = auth.uid())
);
create policy "Users manage own recipe_ingredients" on recipe_ingredients for all using (
  exists (select 1 from recipes where recipes.id = recipe_ingredients.recipe_id and recipes.user_id = auth.uid())
);
create policy "Users manage own meal_plans" on meal_plans for all using (auth.uid() = user_id);
create policy "Users manage own shopping_items" on shopping_items for all using (auth.uid() = user_id);

-- Cuisines: public read, no write from client
create policy "Cuisines are public" on cuisines for select using (true);

-- ============================================================================
-- DEFAULT CUISINES DATA
-- ============================================================================

insert into cuisines (name_fr, name_en, flag, sort_order) values
  ('Française', 'French', '🇫🇷', 1),
  ('Italienne', 'Italian', '🇮🇹', 2),
  ('Mexicaine', 'Mexican', '🇲🇽', 3),
  ('Japonaise', 'Japanese', '🇯🇵', 4),
  ('Chinoise', 'Chinese', '🇨🇳', 5),
  ('Indienne', 'Indian', '🇮🇳', 6),
  ('Américaine', 'American', '🇺🇸', 7),
  ('Espagnole', 'Spanish', '🇪🇸', 8),
  ('Thaïlandaise', 'Thai', '🇹🇭', 9),
  ('Marocaine', 'Moroccan', '🇲🇦', 10),
  ('Grecque', 'Greek', '🇬🇷', 11),
  ('Belge', 'Belgian', '🇧🇪', 12),
  ('Autre', 'Other', '🌍', 13);

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGN-UP
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, language)
  values (new.id, 'fr')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
