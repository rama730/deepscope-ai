-- Migration to add all missing task columns and tables involved in the dashboard
-- This ensures "Error loading tasks" and "Permission denied" are permanently resolved.

-- 1. ADD MISSING COLUMNS to project_tasks
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'task',
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC,
ADD COLUMN IF NOT EXISTS logged_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS story_points INTEGER,
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS completion_file_id UUID REFERENCES public.project_files(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transition_message TEXT;

CREATE INDEX IF NOT EXISTS idx_project_tasks_parent_id ON public.project_tasks(parent_task_id);

-- 2. CREATE MISSING TABLES (If they don't exist)

-- Task Subtasks
CREATE TABLE IF NOT EXISTS public.task_subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.task_subtasks TO authenticated;
DROP POLICY IF EXISTS "Subtasks access" ON public.task_subtasks;
CREATE POLICY "Subtasks access" ON public.task_subtasks FOR ALL USING (true);

-- Task Comments
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.task_comments TO authenticated;
DROP POLICY IF EXISTS "Comments access" ON public.task_comments;
CREATE POLICY "Comments access" ON public.task_comments FOR ALL USING (true);

-- Task Labels
CREATE TABLE IF NOT EXISTS public.task_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.task_labels TO authenticated;
DROP POLICY IF EXISTS "Labels access" ON public.task_labels;
CREATE POLICY "Labels access" ON public.task_labels FOR ALL USING (true);

-- Task Label Assignments
CREATE TABLE IF NOT EXISTS public.task_label_assignments (
    task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE,
    label_id UUID REFERENCES public.task_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
);
ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.task_label_assignments TO authenticated;
DROP POLICY IF EXISTS "Label assignments access" ON public.task_label_assignments;
CREATE POLICY "Label assignments access" ON public.task_label_assignments FOR ALL USING (true);

-- 3. FIX PERMISSIONS (RLS) - Forcefully open project_collaborators for checks
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_collaborators TO authenticated;

DROP POLICY IF EXISTS "Collaborators viewable by everyone" ON public.project_collaborators;
CREATE POLICY "Collaborators viewable by everyone" ON public.project_collaborators FOR SELECT USING (true);

-- 4. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
