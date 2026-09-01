-- ==============================================================================
-- MIGRATION 0028: PROJECT FILES METADATA + TASK LINKING (SAFE / IF NOT EXISTS)
-- Purpose: Align DB schema with UI expectations for project files:
-- - description (optional)
-- - submission_type (general vs task_completion)
-- - linked_task_id (optional link to a task)
-- ==============================================================================

alter table public.project_files
  add column if not exists description text;

alter table public.project_files
  add column if not exists submission_type text not null default 'general';

alter table public.project_files
  add column if not exists linked_task_id uuid references public.project_tasks(id) on delete set null;

create index if not exists idx_project_files_project_id_created_at
  on public.project_files (project_id, created_at desc);

create index if not exists idx_project_files_linked_task_id
  on public.project_files (linked_task_id);

