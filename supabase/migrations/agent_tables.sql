-- ============================================================================
-- FAMILY AGENT — Conversations & Messages
-- Run this in your Supabase SQL editor
-- ============================================================================

create table if not exists agent_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Nouvelle conversation',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agent_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references agent_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists agent_messages_conversation_id_idx on agent_messages(conversation_id);
create index if not exists agent_conversations_user_id_idx on agent_conversations(user_id);

-- RLS
alter table agent_conversations enable row level security;
alter table agent_messages enable row level security;

create policy "Users manage own conversations" on agent_conversations
  for all using (auth.uid() = user_id);

create policy "Users manage own messages" on agent_messages
  for all using (
    exists (
      select 1 from agent_conversations
      where agent_conversations.id = agent_messages.conversation_id
      and agent_conversations.user_id = auth.uid()
    )
  );
