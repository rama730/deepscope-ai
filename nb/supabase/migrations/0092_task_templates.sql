-- ==============================================================================
-- MIGRATION 0092: TASK TEMPLATES
-- Purpose: Provide task templates (global + project-specific) used by TaskTemplates UI.
-- ==============================================================================

create table if not exists public.task_templates (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  description text,
  title text not null,
  task_description text,
  priority text not null default 'medium',
  estimated_hours numeric,
  tags text[] not null default '{}',
  is_global boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_task_templates_project_id on public.task_templates(project_id);
create index if not exists idx_task_templates_is_global on public.task_templates(is_global);

alter table public.task_templates enable row level security;
grant all on table public.task_templates to authenticated;
grant all on table public.task_templates to service_role;

-- Drop old policies if re-running migration
drop policy if exists "Task templates select" on public.task_templates;
drop policy if exists "Task templates insert" on public.task_templates;
drop policy if exists "Task templates update" on public.task_templates;
drop policy if exists "Task templates delete" on public.task_templates;

-- Membership check (creator OR collaborator)
-- NOTE: Some deployments don't have public.project_members. To keep this migration portable,
-- we only reference tables that are present in the baseline schema (projects + project_collaborators).

create policy "Task templates select" on public.task_templates
for select using (
  is_global = true
  or (
    project_id is not null and (
      exists (select 1 from public.projects p where p.id = task_templates.project_id and p.creator_id = auth.uid())
      or exists (select 1 from public.project_collaborators pc where pc.project_id = task_templates.project_id and pc.user_id = auth.uid())
    )
  )
);

create policy "Task templates insert" on public.task_templates
for insert with check (
  created_by = auth.uid()
  and is_global = false
  and project_id is not null
  and (
    exists (select 1 from public.projects p where p.id = task_templates.project_id and p.creator_id = auth.uid())
    or exists (select 1 from public.project_collaborators pc where pc.project_id = task_templates.project_id and pc.user_id = auth.uid())
  )
);

create policy "Task templates update" on public.task_templates
for update using (
  is_global = false
  and project_id is not null
  and (
    created_by = auth.uid()
    or exists (select 1 from public.projects p where p.id = task_templates.project_id and p.creator_id = auth.uid())
  )
) with check (
  is_global = false
  and project_id is not null
);

create policy "Task templates delete" on public.task_templates
for delete using (
  is_global = false
  and project_id is not null
  and (
    created_by = auth.uid()
    or exists (select 1 from public.projects p where p.id = task_templates.project_id and p.creator_id = auth.uid())
  )
);

notify pgrst, 'reload schema';


