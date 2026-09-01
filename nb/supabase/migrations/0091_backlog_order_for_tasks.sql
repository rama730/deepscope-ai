-- ==============================================================================
-- MIGRATION 0091: BACKLOG ORDER FOR TASKS
-- Purpose: Support deterministic backlog ordering used by SprintPlanning.
-- ==============================================================================

-- 1) Add backlog_order column (if missing)
alter table public.project_tasks
add column if not exists backlog_order integer;

-- 2) Backfill backlog_order for existing tasks that are in backlog (sprint_id is null)
-- Use created_at ordering to produce a stable initial order.
with ranked as (
  select
    id,
    row_number() over (partition by project_id order by created_at asc, id asc) as rn
  from public.project_tasks
  where sprint_id is null
)
update public.project_tasks t
set backlog_order = r.rn
from ranked r
where t.id = r.id
  and (t.backlog_order is null or t.backlog_order = 0);

-- 3) Index for fast backlog queries
create index if not exists idx_project_tasks_backlog_order
  on public.project_tasks (project_id, backlog_order)
  where sprint_id is null;


