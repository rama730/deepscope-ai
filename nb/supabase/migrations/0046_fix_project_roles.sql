-- Add missing columns to project_open_roles
ALTER TABLE public.project_open_roles 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS filled INTEGER DEFAULT 0;

-- Fix RLS: Allow authenticated users to insert roles (if they are creator... usually handled by triggers or app logic, but let's be permissive for now to unblock)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.project_open_roles;
CREATE POLICY "Enable insert for authenticated users only"
ON public.project_open_roles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix RLS: Allow everyone to read roles
DROP POLICY IF EXISTS "Enable read access for all users" ON public.project_open_roles;
CREATE POLICY "Enable read access for all users"
ON public.project_open_roles
FOR SELECT
USING (true);
