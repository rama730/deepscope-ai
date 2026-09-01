-- MANUAL FIX SCRIPT (FINAL VERSION - COMPLETE)
-- Run this in Supabase SQL Editor

-- 1. ADD MISSING COLUMNS (All potential missing fields)
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

-- 2. CREATE MISSING TABLES (If migration 0023 didn't run)

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
CREATE POLICY "Subtasks access" ON public.task_subtasks FOR ALL USING (true); -- Simplified for immediate fix

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
CREATE POLICY "Comments access" ON public.task_comments FOR ALL USING (true); -- Simplified for immediate fix

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


-- 3. RESET & FIX PERMISSIONS (RLS)

-- A. Project Collaborators: Ensure it is readable by authenticated users
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Grant explicit SELECT permission
GRANT SELECT ON public.project_collaborators TO authenticated;

-- Drop generic policies that might conflict
DROP POLICY IF EXISTS "Collaborators viewable by everyone" ON public.project_collaborators;
DROP POLICY IF EXISTS "Collaborators visible to everyone" ON public.project_collaborators;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.project_collaborators;

-- Create the ONE permissve policy
CREATE POLICY "Collaborators viewable by everyone"
ON public.project_collaborators FOR SELECT
USING (true);


-- B. Project Tasks: Ensure explicit INSERT permissions
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.project_tasks TO authenticated;

-- Drop old/conflicting policies
DROP POLICY IF EXISTS "Project tasks manageable by members" ON public.project_tasks;
DROP POLICY IF EXISTS "Tasks visible to members and creators" ON public.project_tasks;
DROP POLICY IF EXISTS "Tasks insertable by members and creators" ON public.project_tasks;
DROP POLICY IF EXISTS "Tasks updatable by members and creators" ON public.project_tasks;
DROP POLICY IF EXISTS "Tasks deletable by members and creators" ON public.project_tasks;

-- Re-create Policies
CREATE POLICY "Tasks visible to members and creators"
ON public.project_tasks FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid())
);

CREATE POLICY "Tasks insertable by members and creators"
ON public.project_tasks FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid())
);

CREATE POLICY "Tasks updatable by members and creators"
ON public.project_tasks FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid())
);

CREATE POLICY "Tasks deletable by members and creators"
ON public.project_tasks FOR DELETE
USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid())
);

-- 4. FORCE SCHEMA CACHE RELOAD
-- This tells Supabase API to recognize the new columns and relationships immediately.
-- 4. FIX STORAGE PERMISSIONS (For File Uploads)

-- Ensure project-files bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view project files" ON storage.objects;

-- Policy: Authenticated users can upload to project-files
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- Policy: Users can update their own project files
CREATE POLICY "Users can update their own project files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files' AND auth.uid() = owner);

-- Policy: Users can delete their own project files
CREATE POLICY "Users can delete their own project files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files' AND auth.uid() = owner);

-- Policy: Public can view project files (or authenticated, depending on need. Public is easier for sharing)
CREATE POLICY "Public can view project files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-files');


-- 5. FORCE SCHEMA CACHE RELOAD
-- This tells Supabase API to recognize the new columns and relationships immediately.
NOTIFY pgrst, 'reload schema';
