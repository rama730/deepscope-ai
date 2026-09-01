-- ==============================================================================
-- MIGRATION 0092: PROJECT SPRINTS COMMITMENT METRICS
-- Purpose: Store the committed scope captured when a sprint is started.
-- ==============================================================================

alter table public.project_sprints
  add column if not exists started_at timestamptz;

alter table public.project_sprints
  add column if not exists committed_tasks integer;

alter table public.project_sprints
  add column if not exists committed_points numeric;

create index if not exists idx_project_sprints_project_id_status
  on public.project_sprints (project_id, status);

