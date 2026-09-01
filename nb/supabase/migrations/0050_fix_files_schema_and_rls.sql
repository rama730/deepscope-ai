-- Migration 0050: Fix Files Schema and RLS
-- Fixes "Error loading files" (missing columns) and "Error creating file record" (missing permissions)

-- 1. ADD MISSING COLUMNS
ALTER TABLE public.project_files
ADD COLUMN IF NOT EXISTS linked_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. FIX RLS POLICIES FOR project_files

-- Enable RLS just in case
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- 2.1 Grants (Ensure authenticated users can actually use the table)
GRANT ALL ON TABLE public.project_files TO authenticated;
GRANT ALL ON TABLE public.project_files TO service_role;

-- 2.2 Drop existing policies to avoid conflicts/confusion
DROP POLICY IF EXISTS "Project files visible to members" ON public.project_files;
DROP POLICY IF EXISTS "Project files manageable by members" ON public.project_files;
DROP POLICY IF EXISTS "Members can upload files" ON public.project_files;
DROP POLICY IF EXISTS "Users can update own files" ON public.project_files;
DROP POLICY IF EXISTS "Users can delete own files" ON public.project_files;
DROP POLICY IF EXISTS "Allow authenticated uploads for project members" ON public.project_files;

-- 2.3 Create New Policies

-- Allow SELECT for members
CREATE POLICY "Files Select Policy" ON public.project_files
FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_files.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_files.project_id AND pc.user_id = auth.uid())
);

-- Allow INSERT for members (Renamed to force update)
CREATE POLICY "Files Insert Policy" ON public.project_files
FOR INSERT TO authenticated WITH CHECK (
    -- Simplest check: Must be authenticated (handled by TO authenticated) and uploaded_by must be self
    uploaded_by = auth.uid()
    -- And must be a member directly (redundant but safe) or owner
    AND (
      EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_files.project_id AND p.creator_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_files.project_id AND pc.user_id = auth.uid())
    )
);

-- Allow UPDATE for own files
CREATE POLICY "Files Update Policy" ON public.project_files
FOR UPDATE TO authenticated USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_files.project_id AND p.creator_id = auth.uid())
);

-- Allow DELETE for own files
CREATE POLICY "Files Delete Policy" ON public.project_files
FOR DELETE TO authenticated USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_files.project_id AND p.creator_id = auth.uid())
);

-- 3. STORAGE POLICIES (project-files bucket)

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies for this bucket
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Members can view project files" ON storage.objects;

-- Policy: Members can upload
CREATE POLICY "Bucket Upload Policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- Policy: Users can update their own files
CREATE POLICY "Bucket Update Policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files' AND auth.uid() = owner);

-- Policy: Users can delete their own files
CREATE POLICY "Bucket Delete Policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files' AND auth.uid() = owner);

-- Policy: Public/Members can view
CREATE POLICY "Bucket Select Policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-files');

-- 4. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
