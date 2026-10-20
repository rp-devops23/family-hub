-- ============================================================================
-- FAMILY AGENT — Journal des actions (confirmation et annulation)
-- À exécuter dans le SQL Editor Supabase AVANT de redéployer la fonction
-- family-agent (supabase functions deploy family-agent --no-verify-jwt).
-- ============================================================================

create table if not exists agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  conversation_id uuid references agent_conversations(id) on delete cascade not null,
  -- Message de l'assistant auquel l'action est rattachée (carte affichée sous la bulle)
  message_id uuid references agent_messages(id) on delete set null,
  tool text not null,
  input jsonb not null default '{}'::jsonb,
  -- Texte lisible : « 3 articles ajoutés à la liste de courses : lait, œufs… »
  summary text not null,
  -- Données d'affichage et d'exécution (ex. dépense à confirmer)
  details jsonb not null default '{}'::jsonb,
  -- pending : en attente de confirmation (finances) · done : effectuée
  -- cancelled : refusée · undone : annulée · failed : échec
  status text not null default 'done'
    check (status in ('pending', 'done', 'cancelled', 'undone', 'failed')),
  -- Instructions pour revenir en arrière : { "ops": [ { "op": "delete" | "update" | "insert", ... } ] }
  undo jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists agent_actions_conversation_idx on agent_actions(conversation_id);
create index if not exists agent_actions_user_idx on agent_actions(user_id);

alter table agent_actions enable row level security;

-- Lecture seule pour l'utilisateur : toutes les écritures passent par la fonction
-- edge (service role), qui vérifie l'appartenance de chaque ligne.
drop policy if exists "Users read own agent actions" on agent_actions;
create policy "Users read own agent actions" on agent_actions
  for select using (auth.uid() = user_id);
