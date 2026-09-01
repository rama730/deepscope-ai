-- ==============================================================================
-- MIGRATION 0091: PROJECT UPDATES MARKERS (PIN / VISIBILITY / MAJOR)
-- Purpose: Ensure columns used by Updates UI exist, with safe defaults.
-- ==============================================================================

alter table public.project_updates
  add column if not exists visibility text default 'public';

alter table public.project_updates
  add column if not exists is_major boolean default false;

alter table public.project_updates
  add column if not exists is_pinned boolean default false;

create index if not exists idx_project_updates_project_id_pinned_created_at
  on public.project_updates (project_id, is_pinned, created_at desc);

