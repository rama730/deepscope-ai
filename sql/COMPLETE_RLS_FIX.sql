-- COMPLETE RLS FIX FOR ALL TABLES
-- Run this entire script in Supabase SQL Editor to fix all RLS policy issues
-- This will recreate all policies from scratch

-- ============================================================
-- 1. PROJECT APPLICATIONS
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Applicants and creators read applications" ON public.project_applications;
DROP POLICY IF EXISTS "Users create own applications" ON public.project_applications;
DROP POLICY IF EXISTS "Creators update applications" ON public.project_applications;

-- Recreate policies
CREATE POLICY "Applicants and creators read applications" 
ON public.project_applications 
FOR SELECT 
USING (
  auth.uid() = applicant_id 
  OR 
  EXISTS(
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = project_applications.project_id 
    AND p.creator_id = auth.uid()
  )
);

CREATE POLICY "Users create own applications" 
ON public.project_applications 
FOR INSERT 
WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Creators update applications" 
ON public.project_applications 
FOR UPDATE 
USING (
  EXISTS(
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = project_applications.project_id 
    AND p.creator_id = auth.uid()
  )
);

-- ============================================================
-- 2. MESSAGES
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users read own messages" ON public.messages;
DROP POLICY IF EXISTS "Users send messages" ON public.messages;

-- Recreate policies
CREATE POLICY "Users read own messages" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() = sender_id 
  OR 
  auth.uid() = recipient_id
);

CREATE POLICY "Users send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- 3. PROJECT COLLABORATORS
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Collaborators readable by all" ON public.project_collaborators;
DROP POLICY IF EXISTS "Creator manages collaborators" ON public.project_collaborators;

-- Recreate policies
CREATE POLICY "Collaborators readable by all" 
ON public.project_collaborators 
FOR SELECT 
USING (true);

CREATE POLICY "Creator manages collaborators" 
ON public.project_collaborators 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = project_collaborators.project_id 
    AND p.creator_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS(
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = project_collaborators.project_id 
    AND p.creator_id = auth.uid()
  )
);

-- ============================================================
-- 4. PROJECT OPEN ROLES
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Open roles readable by all" ON public.project_open_roles;
DROP POLICY IF EXISTS "Creator manages open roles" ON public.project_open_roles;

-- Recreate policies
CREATE POLICY "Open roles readable by all" 
ON public.project_open_roles 
FOR SELECT 
USING (true);

CREATE POLICY "Creator manages open roles" 
ON public.project_open_roles 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = project_open_roles.project_id 
    AND p.creator_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS(
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = project_open_roles.project_id 
    AND p.creator_id = auth.uid()
  )
);

-- ============================================================
-- 5. PROJECT BOOKMARKS
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users read own project bookmarks" ON public.project_bookmarks;
DROP POLICY IF EXISTS "Users add project bookmarks" ON public.project_bookmarks;
DROP POLICY IF EXISTS "Users remove own project bookmarks" ON public.project_bookmarks;

-- Recreate policies
CREATE POLICY "Users read own project bookmarks" 
ON public.project_bookmarks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users add project bookmarks" 
ON public.project_bookmarks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own project bookmarks" 
ON public.project_bookmarks 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check all policies are created
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
  'project_applications',
  'messages',
  'project_collaborators',
  'project_open_roles',
  'project_bookmarks'
)
ORDER BY tablename, policyname;

-- Check RLS is enabled on all tables
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'project_applications',
  'messages',
  'project_collaborators',
  'project_open_roles',
  'project_bookmarks'
);

-- Expected output:
-- All tables should show rowsecurity = true
-- project_applications should have 3 policies
-- messages should have 2 policies
-- project_collaborators should have 2 policies
-- project_open_roles should have 2 policies
-- project_bookmarks should have 3 policies

COMMIT;
















