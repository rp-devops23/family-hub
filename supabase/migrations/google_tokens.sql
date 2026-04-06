-- ============================================================================
-- GOOGLE WORKSPACE — OAuth token storage
-- Run this in your Supabase SQL editor
-- ============================================================================

create table if not exists google_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text,                        -- Google account email (display only)
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,   -- when access_token expires
  scopes text[],                     -- granted scopes
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for lookups
create index if not exists google_tokens_user_id_idx on google_tokens(user_id);

-- RLS
alter table google_tokens enable row level security;

-- Only the owning user can read/write their own tokens
create policy "Users manage own google tokens" on google_tokens
  for all using (auth.uid() = user_id);
