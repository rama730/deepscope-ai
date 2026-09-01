-- Fix RLS Policies for Project Applications
-- Run this in your Supabase SQL Editor if you're having issues with checking existing applications

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Applicants and creators read applications" ON public.project_applications;
DROP POLICY IF EXISTS "Users create own applications" ON public.project_applications;
DROP POLICY IF EXISTS "Creators update applications" ON public.project_applications;

-- Recreate policies with proper permissions
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

-- Verify the policies are active
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'project_applications';

-- Test query: Check if you can read your own applications (replace user_id with your actual user ID)
-- SELECT * FROM project_applications WHERE applicant_id = auth.uid();
















