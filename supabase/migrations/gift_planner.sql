-- ============================================================================
-- FAMILY HUB — Planificateur de cadeaux (Shopping → Cadeaux)
--
-- Événement (ex. « Noël 2026 ») → groupes libres (famille, amis…) → personnes → idées de cadeaux.
-- Budgets en cascade, tous facultatifs : par personne, par groupe et pour l'événement entier.
-- Un cadeau = une IDÉE par personne (plusieurs possibles), avec un statut : idée → décidé → acheté.
-- Remplace l'ancien onglet « Cadeaux » (cadeaux à plat dans personal_shopping_items, category = 'gift').
-- À exécuter dans le SQL Editor Supabase. Rejouable sans risque.
-- ============================================================================

create table if not exists gift_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  event_date date,
  -- Budget global (facultatif). Sans valeur, on additionne les budgets des groupes.
  total_budget numeric(10, 2) check (total_budget is null or total_budget >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists gift_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references gift_events(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  -- Budget du groupe (facultatif). Sans valeur, on additionne les budgets des personnes.
  budget numeric(10, 2) check (budget is null or budget >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists gift_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references gift_groups(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  budget numeric(10, 2) check (budget is null or budget >= 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists gift_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references gift_people(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  -- idea = simple idée · decided = je compte l'acheter · bought = acheté
  status text not null default 'idea' check (status in ('idea', 'decided', 'bought')),
  estimated_price numeric(10, 2) check (estimated_price is null or estimated_price >= 0),
  actual_price numeric(10, 2) check (actual_price is null or actual_price >= 0),
  store text,
  url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gift_events_user_idx on gift_events(user_id);
create index if not exists gift_groups_event_idx on gift_groups(event_id);
create index if not exists gift_groups_user_idx on gift_groups(user_id);
create index if not exists gift_people_group_idx on gift_people(group_id);
create index if not exists gift_people_user_idx on gift_people(user_id);
create index if not exists gift_ideas_person_idx on gift_ideas(person_id);
create index if not exists gift_ideas_user_idx on gift_ideas(user_id);

alter table gift_events enable row level security;
alter table gift_groups enable row level security;
alter table gift_people enable row level security;
alter table gift_ideas enable row level security;

drop policy if exists "Users manage own gift events" on gift_events;
create policy "Users manage own gift events" on gift_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own gift groups" on gift_groups;
create policy "Users manage own gift groups" on gift_groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own gift people" on gift_people;
create policy "Users manage own gift people" on gift_people
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own gift ideas" on gift_ideas;
create policy "Users manage own gift ideas" on gift_ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
