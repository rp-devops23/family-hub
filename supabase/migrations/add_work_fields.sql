-- ============================================================================
-- Add work-specific fields to tasks table
-- Run this in your Supabase SQL editor
-- ============================================================================

alter table tasks
  add column if not exists priority       integer check (priority in (1, 2, 3)),
  add column if not exists estimated_amount numeric(10, 2),
  add column if not exists drive_link     text;
