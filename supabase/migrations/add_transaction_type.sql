-- ============================================================================
-- Add type column to transactions (expense | income)
-- Run this in your Supabase SQL editor
-- ============================================================================

alter table transactions
  add column if not exists type text not null default 'expense'
  check (type in ('expense', 'income'));
