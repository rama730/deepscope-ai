-- ==============================================================================
-- MIGRATION 0093: PROJECT CHAT MESSAGE TASK LINKS + TYPES
-- Purpose: Support task-linked/system messages in project chat (TaskTransitionModal).
-- ==============================================================================

alter table public.project_chat_messages
add column if not exists linked_task_id uuid references public.project_tasks(id) on delete set null,
add column if not exists message_type text default 'text';

create index if not exists idx_project_chat_messages_linked_task_id
  on public.project_chat_messages (linked_task_id);

notify pgrst, 'reload schema';


