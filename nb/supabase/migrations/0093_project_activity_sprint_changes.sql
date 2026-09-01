-- ==============================================================================
-- MIGRATION 0093: PROJECT ACTIVITY - SPRINT SCOPE CHANGES
-- Purpose: Log task sprint moves and sprint lifecycle changes into project_activity_events.
-- Depends on MIGRATION 0089 (project_activity_events + log_project_activity).
-- ==============================================================================

-- 1) Log task sprint changes
create or replace function public.trg_log_task_sprint_changed() returns trigger as $$
begin
  if new.sprint_id is distinct from old.sprint_id then
    perform public.log_project_activity(
      new.project_id,
      auth.uid(),
      'task_sprint_changed',
      'project_tasks',
      new.id,
      new.title,
      'moved "' || coalesce(new.title, 'a task') || '" between sprints',
      jsonb_build_object(
        'kind', 'task_sprint_changed',
        'task_id', new.id,
        'title', new.title,
        'story_points', coalesce(new.story_points, 0),
        'before_sprint_id', old.sprint_id,
        'after_sprint_id', new.sprint_id
      ),
      new.updated_at
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_project_tasks_sprint_changed_activity on public.project_tasks;
create trigger trg_project_tasks_sprint_changed_activity
after update on public.project_tasks
for each row execute function public.trg_log_task_sprint_changed();

-- 2) Log sprint lifecycle transitions (start/complete)
create or replace function public.trg_log_project_sprint_status_changed() returns trigger as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'active' then
      perform public.log_project_activity(
        new.project_id,
        auth.uid(),
        'sprint_started',
        'project_sprints',
        new.id,
        new.name,
        'started sprint "' || coalesce(new.name, 'a sprint') || '"',
        jsonb_build_object(
          'kind', 'sprint_started',
          'sprint_id', new.id,
          'name', new.name,
          'start_date', new.start_date,
          'end_date', new.end_date
        ),
        coalesce(new.started_at, now())
      );
    elsif new.status = 'completed' then
      perform public.log_project_activity(
        new.project_id,
        auth.uid(),
        'sprint_completed',
        'project_sprints',
        new.id,
        new.name,
        'completed sprint "' || coalesce(new.name, 'a sprint') || '"',
        jsonb_build_object(
          'kind', 'sprint_completed',
          'sprint_id', new.id,
          'name', new.name,
          'velocity', new.velocity,
          'completed_at', new.completed_at
        ),
        coalesce(new.completed_at, now())
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_project_sprints_status_changed_activity on public.project_sprints;
create trigger trg_project_sprints_status_changed_activity
after update on public.project_sprints
for each row execute function public.trg_log_project_sprint_status_changed();

