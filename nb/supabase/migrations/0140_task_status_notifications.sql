-- ==============================================================================
-- MIGRATION 0140: TASK STATUS NOTIFICATIONS (START / DONE)
-- Purpose: Replace task-linked chat/submission workflow with lightweight,
--          realtime in-app notifications for project members.
-- Depends on: public.notifications table + public.create_notification helper.
-- ==============================================================================

create or replace function public.handle_task_status_notifications()
returns trigger as $$
declare
  actor_id uuid;
  actor_name text;
  project_title text;
  recipient_id uuid;
  notif_type text;
  notif_title text;
  verb text;
begin
  -- Only react to status changes
  if new.status is distinct from old.status then
    if new.status = 'in_progress' then
      notif_type := 'task_started';
      notif_title := 'Task started';
      verb := 'started';
    elsif new.status = 'done' then
      notif_type := 'task_completed';
      notif_title := 'Task completed';
      verb := 'completed';
    else
      return new;
    end if;

    actor_id := auth.uid();

    select coalesce(p.full_name, p.username, 'Someone')
      into actor_name
    from public.profiles p
    where p.id = actor_id;

    select coalesce(pr.title, 'Project')
      into project_title
    from public.projects pr
    where pr.id = new.project_id;

    -- Notify: project creator + collaborators (excluding actor handled by create_notification)
    for recipient_id in
      (
        select pr.creator_id from public.projects pr where pr.id = new.project_id
        union
        select pc.user_id from public.project_collaborators pc where pc.project_id = new.project_id
      )
    loop
      perform public.create_notification(
        recipient_id,
        notif_type,
        notif_title,
        actor_name || ' ' || verb || ' task: "' || coalesce(new.title, 'a task') || '"',
        '/projects/' || new.project_id || '?taskId=' || new.id,
        actor_id,
        'task',
        new.id
      );
    end loop;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_task_status_notifications on public.project_tasks;
create trigger trg_task_status_notifications
after update on public.project_tasks
for each row execute function public.handle_task_status_notifications();

