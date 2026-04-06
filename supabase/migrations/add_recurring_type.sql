-- ============================================================================
-- Add type column to recurring_templates (expense | income)
-- Run this in your Supabase SQL editor
-- ============================================================================

alter table recurring_templates
  add column if not exists type text not null default 'expense'
  check (type in ('expense', 'income'));
