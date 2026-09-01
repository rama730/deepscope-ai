-- ==============================================================================
-- MIGRATION 0089: PROJECT ACTIVITY EVENTS (PROJECT TIMELINE / PULSE STREAM)
-- Purpose: Provide a durable, queryable activity timeline for projects with
-- triggers that log key events (project created/updated, tasks, files, chat, updates, members).
-- ==============================================================================

-- 1) TABLE
create table if not exists public.project_activity_events (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    actor_id uuid references public.profiles(id) on delete set null,
    event_type text not null, -- task_completed, task_created, file_uploaded, member_joined, message_sent, project_updated
    entity_type text,         -- projects, project_tasks, project_files, project_chat_messages, project_updates, project_collaborators
    entity_id uuid,
    title text,
    description text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_project_activity_events_project_id_created_at
    on public.project_activity_events (project_id, created_at desc);
create index if not exists idx_project_activity_events_event_type
    on public.project_activity_events (event_type);

alter table public.project_activity_events enable row level security;

-- Membership-based read access (prevents leaking task/chat/file events to non-members)
drop policy if exists "Project activity select policy" on public.project_activity_events;
create policy "Project activity select policy"
    on public.project_activity_events
    for select
    using (
        exists (select 1 from public.projects p where p.id = project_activity_events.project_id and p.creator_id = auth.uid())
        or exists (select 1 from public.project_collaborators pc where pc.project_id = project_activity_events.project_id and pc.user_id = auth.uid())
        -- Allow public read for safe project-level events (project created + project updates)
        or (
            project_activity_events.event_type = 'project_updated'
            and (project_activity_events.metadata->>'kind') in ('project_created', 'project_update')
        )
    );

-- Inserts/updates are via SECURITY DEFINER functions + triggers; no direct client insert.
revoke all on table public.project_activity_events from anon, authenticated;
grant select on table public.project_activity_events to authenticated;

-- 2) INSERT HELPER (SECURITY DEFINER)
create or replace function public.log_project_activity(
    project_id uuid,
    actor_id uuid,
    event_type text,
    entity_type text,
    entity_id uuid,
    title text,
    description text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default null
) returns void as $$
begin
    insert into public.project_activity_events (
        project_id,
        actor_id,
        event_type,
        entity_type,
        entity_id,
        title,
        description,
        metadata,
        created_at
    )
    values (
        project_id,
        actor_id,
        event_type,
        entity_type,
        entity_id,
        title,
        description,
        coalesce(metadata, '{}'::jsonb),
        coalesce(created_at, now())
    );
end;
$$ language plpgsql security definer;

grant execute on function public.log_project_activity(uuid, uuid, text, text, uuid, text, text, jsonb, timestamptz) to authenticated;

-- 3) TRIGGERS

-- 3a) Projects: created + "details changed" updates
create or replace function public.trg_log_project_created() returns trigger as $$
begin
    perform public.log_project_activity(
        new.id,
        new.creator_id,
        'project_updated',
        'projects',
        new.id,
        new.title,
        'created this project',
        jsonb_build_object(
            'kind', 'project_created',
            'project', jsonb_build_object(
                'title', new.title,
                'description', new.description,
                'vision', new.vision,
                'status', new.status,
                'tags', new.tags,
                'technologies_used', new.technologies_used
            )
        ),
        new.created_at
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_project_created_activity on public.projects;
create trigger trg_project_created_activity
after insert on public.projects
for each row execute function public.trg_log_project_created();

create or replace function public.trg_log_project_updated() returns trigger as $$
declare
    changed_fields text[];
begin
    changed_fields := array[]::text[];

    if new.title is distinct from old.title then changed_fields := array_append(changed_fields, 'title'); end if;
    if new.description is distinct from old.description then changed_fields := array_append(changed_fields, 'description'); end if;
    if new.vision is distinct from old.vision then changed_fields := array_append(changed_fields, 'vision'); end if;
    if new.status is distinct from old.status then changed_fields := array_append(changed_fields, 'status'); end if;
    if new.tags is distinct from old.tags then changed_fields := array_append(changed_fields, 'tags'); end if;
    if new.technologies_used is distinct from old.technologies_used then changed_fields := array_append(changed_fields, 'technologies_used'); end if;
    if new.lifecycle_stages is distinct from old.lifecycle_stages then changed_fields := array_append(changed_fields, 'lifecycle_stages'); end if;
    if new.current_stage_index is distinct from old.current_stage_index then changed_fields := array_append(changed_fields, 'current_stage_index'); end if;

    -- Only log when something meaningful changed
    if array_length(changed_fields, 1) is null then
        return new;
    end if;

    perform public.log_project_activity(
        new.id,
        auth.uid(),
        'project_updated',
        'projects',
        new.id,
        new.title,
        'updated project details',
        jsonb_build_object(
            'kind', 'project_details_updated',
            'changed_fields', to_jsonb(changed_fields),
            'before', jsonb_build_object(
                'title', old.title,
                'description', old.description,
                'vision', old.vision,
                'status', old.status,
                'tags', old.tags,
                'technologies_used', old.technologies_used,
                'lifecycle_stages', old.lifecycle_stages,
                'current_stage_index', old.current_stage_index
            ),
            'after', jsonb_build_object(
                'title', new.title,
                'description', new.description,
                'vision', new.vision,
                'status', new.status,
                'tags', new.tags,
                'technologies_used', new.technologies_used,
                'lifecycle_stages', new.lifecycle_stages,
                'current_stage_index', new.current_stage_index
            )
        ),
        new.updated_at
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_project_updated_activity on public.projects;
create trigger trg_project_updated_activity
after update on public.projects
for each row execute function public.trg_log_project_updated();

-- 3b) Project updates: inserted
create or replace function public.trg_log_project_update_posted() returns trigger as $$
begin
    perform public.log_project_activity(
        new.project_id,
        new.created_by,
        'project_updated',
        'project_updates',
        new.id,
        new.title,
        case when new.title is not null and length(trim(new.title)) > 0
            then 'posted an update: "' || new.title || '"'
            else 'posted an update'
        end,
        jsonb_build_object(
            'kind', 'project_update',
            'update_type', new.update_type,
            'title', new.title,
            'content', new.content
        ),
        new.created_at
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_project_updates_activity on public.project_updates;
create trigger trg_project_updates_activity
after insert on public.project_updates
for each row execute function public.trg_log_project_update_posted();

-- 3c) Tasks: created + status/assignment changes
create or replace function public.trg_log_task_created() returns trigger as $$
begin
    perform public.log_project_activity(
        new.project_id,
        new.created_by,
        'task_created',
        'project_tasks',
        new.id,
        new.title,
        'created task "' || coalesce(new.title, 'Untitled') || '"',
        jsonb_build_object(
            'kind', 'task_created',
            'status', new.status,
            'priority', new.priority,
            'assigned_to', new.assigned_to
        ),
        new.created_at
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_project_tasks_created_activity on public.project_tasks;
create trigger trg_project_tasks_created_activity
after insert on public.project_tasks
for each row execute function public.trg_log_task_created();

create or replace function public.trg_log_task_updated() returns trigger as $$
begin
    if new.status is distinct from old.status then
        if new.status = 'done' then
            perform public.log_project_activity(
                new.project_id,
                auth.uid(),
                'task_completed',
                'project_tasks',
                new.id,
                new.title,
                'completed "' || coalesce(new.title, 'a task') || '"',
                jsonb_build_object('kind', 'task_completed', 'before_status', old.status, 'after_status', new.status),
                new.updated_at
            );
        else
            perform public.log_project_activity(
                new.project_id,
                auth.uid(),
                'project_updated',
                'project_tasks',
                new.id,
                new.title,
                'updated task "' || coalesce(new.title, 'a task') || '"',
                jsonb_build_object('kind', 'task_status_changed', 'before_status', old.status, 'after_status', new.status),
                new.updated_at
            );
        end if;
    end if;

    if new.assigned_to is distinct from old.assigned_to then
        perform public.log_project_activity(
            new.project_id,
            auth.uid(),
            'project_updated',
            'project_tasks',
            new.id,
            new.title,
            'updated assignment for "' || coalesce(new.title, 'a task') || '"',
            jsonb_build_object('kind', 'task_assignment_changed', 'before_assigned_to', old.assigned_to, 'after_assigned_to', new.assigned_to),
            new.updated_at
        );
    end if;

    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_project_tasks_updated_activity on public.project_tasks;
create trigger trg_project_tasks_updated_activity
after update on public.project_tasks
for each row execute function public.trg_log_task_updated();

-- 3d) Files: uploaded
create or replace function public.trg_log_file_uploaded() returns trigger as $$
begin
    perform public.log_project_activity(
        new.project_id,
        new.uploaded_by,
        'file_uploaded',
        'project_files',
        new.id,
        new.name,
        'uploaded "' || coalesce(new.name, 'a file') || '"',
        jsonb_build_object('kind', 'file_uploaded', 'name', new.name, 'category', new.category, 'file_type', new.file_type),
        new.created_at
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_project_files_activity on public.project_files;
create trigger trg_project_files_activity
after insert on public.project_files
for each row execute function public.trg_log_file_uploaded();

-- 3e) Chat: message sent (store only excerpt to avoid leaking long content in activity rows)
create or replace function public.trg_log_chat_message_sent() returns trigger as $$
declare
    excerpt text;
begin
    excerpt := left(coalesce(new.content, ''), 280);

    perform public.log_project_activity(
        new.project_id,
        new.sender_id,
        'message_sent',
        'project_chat_messages',
        new.id,
        null,
        'sent a message',
        jsonb_build_object('kind', 'message_sent', 'excerpt', excerpt),
        new.created_at
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_project_chat_messages_activity on public.project_chat_messages;
create trigger trg_project_chat_messages_activity
after insert on public.project_chat_messages
for each row execute function public.trg_log_chat_message_sent();

-- 3f) Members: joined
create or replace function public.trg_log_member_joined() returns trigger as $$
begin
    perform public.log_project_activity(
        new.project_id,
        new.user_id,
        'member_joined',
        'project_collaborators',
        new.id,
        null,
        'joined as ' || coalesce(new.role, 'team member'),
        jsonb_build_object('kind', 'member_joined', 'role', new.role),
        coalesce(new.joined_at, now())
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_project_collaborators_activity on public.project_collaborators;
create trigger trg_project_collaborators_activity
after insert on public.project_collaborators
for each row execute function public.trg_log_member_joined();

-- 4) ONE-TIME BACKFILL (best-effort) so existing projects have a timeline immediately.
-- Avoid duplicates by checking entity_type/entity_id/kind where possible.

-- Project created events
insert into public.project_activity_events (project_id, actor_id, event_type, entity_type, entity_id, title, description, metadata, created_at)
select
    p.id,
    p.creator_id,
    'project_updated',
    'projects',
    p.id,
    p.title,
    'created this project',
    jsonb_build_object(
        'kind', 'project_created',
        'project', jsonb_build_object(
            'title', p.title,
            'description', p.description,
            'vision', p.vision,
            'status', p.status,
            'tags', p.tags,
            'technologies_used', p.technologies_used
        )
    ),
    p.created_at
from public.projects p
where not exists (
    select 1 from public.project_activity_events e
    where e.project_id = p.id
      and e.entity_type = 'projects'
      and e.entity_id = p.id
      and (e.metadata->>'kind') = 'project_created'
);

-- Project updates posted
insert into public.project_activity_events (project_id, actor_id, event_type, entity_type, entity_id, title, description, metadata, created_at)
select
    u.project_id,
    u.created_by,
    'project_updated',
    'project_updates',
    u.id,
    u.title,
    case when u.title is not null and length(trim(u.title)) > 0
        then 'posted an update: "' || u.title || '"'
        else 'posted an update'
    end,
    jsonb_build_object(
        'kind', 'project_update',
        'update_type', u.update_type,
        'title', u.title,
        'content', u.content
    ),
    u.created_at
from public.project_updates u
where not exists (
    select 1 from public.project_activity_events e
    where e.entity_type = 'project_updates' and e.entity_id = u.id
);

-- Tasks created
insert into public.project_activity_events (project_id, actor_id, event_type, entity_type, entity_id, title, description, metadata, created_at)
select
    t.project_id,
    t.created_by,
    'task_created',
    'project_tasks',
    t.id,
    t.title,
    'created task "' || coalesce(t.title, 'Untitled') || '"',
    jsonb_build_object('kind', 'task_created', 'status', t.status, 'priority', t.priority, 'assigned_to', t.assigned_to),
    t.created_at
from public.project_tasks t
where not exists (
    select 1 from public.project_activity_events e
    where e.entity_type = 'project_tasks' and e.entity_id = t.id and e.event_type = 'task_created'
);

-- Files uploaded
insert into public.project_activity_events (project_id, actor_id, event_type, entity_type, entity_id, title, description, metadata, created_at)
select
    f.project_id,
    f.uploaded_by,
    'file_uploaded',
    'project_files',
    f.id,
    f.name,
    'uploaded "' || coalesce(f.name, 'a file') || '"',
    jsonb_build_object('kind', 'file_uploaded', 'name', f.name, 'category', f.category, 'file_type', f.file_type),
    f.created_at
from public.project_files f
where not exists (
    select 1 from public.project_activity_events e
    where e.entity_type = 'project_files' and e.entity_id = f.id
);

-- Chat messages sent (excerpt only)
insert into public.project_activity_events (project_id, actor_id, event_type, entity_type, entity_id, title, description, metadata, created_at)
select
    m.project_id,
    m.sender_id,
    'message_sent',
    'project_chat_messages',
    m.id,
    null,
    'sent a message',
    jsonb_build_object('kind', 'message_sent', 'excerpt', left(coalesce(m.content, ''), 280)),
    m.created_at
from public.project_chat_messages m
where not exists (
    select 1 from public.project_activity_events e
    where e.entity_type = 'project_chat_messages' and e.entity_id = m.id
);

-- Members joined
insert into public.project_activity_events (project_id, actor_id, event_type, entity_type, entity_id, title, description, metadata, created_at)
select
    c.project_id,
    c.user_id,
    'member_joined',
    'project_collaborators',
    c.id,
    null,
    'joined as ' || coalesce(c.role, 'team member'),
    jsonb_build_object('kind', 'member_joined', 'role', c.role),
    coalesce(c.joined_at, now())
from public.project_collaborators c
where not exists (
    select 1 from public.project_activity_events e
    where e.entity_type = 'project_collaborators' and e.entity_id = c.id
);


