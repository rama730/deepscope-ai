-- Migration 0057: Fix RLS policies for project_applications
-- This migration explicitly resets and fixes permissions to resolve the 42501 error

BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Applicants and creators read applications" ON public.project_applications;
DROP POLICY IF EXISTS "Users create own applications" ON public.project_applications;
DROP POLICY IF EXISTS "Creators update applications" ON public.project_applications;
DROP POLICY IF EXISTS "Applicants update own applications" ON public.project_applications;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.project_applications;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.project_applications;

-- 3. Recreate Policies

-- Policy 1: Read Access
-- Allow applicants to see their own applications
-- Allow project creators to see all applications for their projects
CREATE POLICY "Applicants and creators read applications" 
ON public.project_applications 
FOR SELECT 
USING (
  auth.uid() = applicant_id 
  OR 
  EXISTS (
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = project_applications.project_id 
    AND p.creator_id = auth.uid()
  )
);

-- Policy 2: Insert Access
-- Allow authenticated users to apply (create application)
CREATE POLICY "Users create own applications" 
ON public.project_applications 
FOR INSERT 
WITH CHECK (auth.uid() = applicant_id);

-- Policy 3: Update Access (Creators)
-- Allow creators to update status (accept/reject)
CREATE POLICY "Creators update applications" 
ON public.project_applications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = project_applications.project_id 
    AND p.creator_id = auth.uid()
  )
);

-- Policy 4: Update Access (Applicants)
-- Allow applicants to withdraw (update status)
-- We use USING to filter which rows they can update check, and WITH CHECK to ensure they don't change ownership
CREATE POLICY "Applicants update own applications" 
ON public.project_applications 
FOR UPDATE 
USING (auth.uid() = applicant_id)
WITH CHECK (auth.uid() = applicant_id);

-- 4. Explicitly Grant Permissions to Roles
-- This is often the missing piece for 42501 if default privileges aren't set
GRANT ALL ON public.project_applications TO postgres;
GRANT ALL ON public.project_applications TO service_role;
GRANT ALL ON public.project_applications TO authenticated;
GRANT SELECT ON public.project_applications TO anon;

COMMIT;
