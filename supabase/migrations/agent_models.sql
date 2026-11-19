-- ============================================================================
-- FAMILY AGENT — Modèles OpenRouter choisis par l'utilisateur
-- À exécuter APRÈS agent_usage_settings.sql, puis redéployer la fonction family-agent.
-- Nécessite aussi le secret Supabase OPENROUTER_API_KEY pour utiliser ces modèles.
-- ============================================================================

-- Liste des modèles OpenRouter de l'utilisateur : chacun peut être activé ou désactivé
create table if not exists agent_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'openrouter' check (provider in ('openrouter')),
  -- Identifiant tel qu'affiché par OpenRouter, ex. « google/gemini-4-neon »
  model_id text not null check (char_length(btrim(model_id)) between 3 and 200),
  enabled boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  unique (user_id, provider, model_id)
);

create index if not exists agent_models_user_idx on agent_models(user_id);

alter table agent_models enable row level security;
drop policy if exists "Users manage own agent models" on agent_models;
create policy "Users manage own agent models" on agent_models
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Modèle actuellement utilisé quand model_mode = 'custom'
alter table agent_settings
  add column if not exists active_model_id uuid references agent_models(id) on delete set null;

alter table agent_settings drop constraint if exists agent_settings_model_mode_check;
alter table agent_settings add constraint agent_settings_model_mode_check
  check (model_mode in ('economy', 'auto', 'balanced', 'quality', 'custom'));

-- Consommation : fournisseur utilisé, et coût inconnu possible (null) pour OpenRouter
alter table agent_usage add column if not exists provider text not null default 'anthropic';
alter table agent_usage alter column cost_usd drop not null;
