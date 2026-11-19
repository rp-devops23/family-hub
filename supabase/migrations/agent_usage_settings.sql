-- ============================================================================
-- FAMILY AGENT — Consommation (tokens, coût estimé) et choix du modèle
-- À exécuter dans le SQL Editor Supabase, puis redéployer la fonction family-agent.
-- Sans cette migration l'agent fonctionne quand même (mode économique, sans suivi).
-- ============================================================================

-- Une ligne par réponse de l'agent : tokens consommés et coût estimé en dollars
create table if not exists agent_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  conversation_id uuid references agent_conversations(id) on delete cascade,
  message_id uuid references agent_messages(id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  -- Nombre d'appels au modèle pour cette réponse (1 + un par tour d'outils)
  calls integer not null default 1,
  tool_calls integer not null default 0,
  -- Estimation : tokens × tarifs du fichier agent_config.ts (pas la facture réelle)
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz default now()
);

create index if not exists agent_usage_user_created_idx on agent_usage(user_id, created_at desc);
create index if not exists agent_usage_message_idx on agent_usage(message_id);

alter table agent_usage enable row level security;
drop policy if exists "Users read own agent usage" on agent_usage;
create policy "Users read own agent usage" on agent_usage
  for select using (auth.uid() = user_id);

-- Réglage par utilisateur : quel modèle utiliser
create table if not exists agent_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- economy = le moins cher (défaut) · auto = économique, puis équilibré pour les questions
  -- complexes · balanced = Sonnet · quality = Opus
  model_mode text not null default 'economy'
    check (model_mode in ('economy', 'auto', 'balanced', 'quality')),
  updated_at timestamptz default now()
);

alter table agent_settings enable row level security;
drop policy if exists "Users manage own agent settings" on agent_settings;
create policy "Users manage own agent settings" on agent_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
