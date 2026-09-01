-- Add missing columns to project_tasks
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'task',
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC,
ADD COLUMN IF NOT EXISTS story_points INTEGER,
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for parent_task_id for performance
CREATE INDEX IF NOT EXISTS idx_project_tasks_parent_id ON public.project_tasks(parent_task_id);
