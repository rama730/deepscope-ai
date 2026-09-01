-- Migration 0039: Fix Open Roles RLS Policy
-- Ensures that project_open_roles are viewable by everyone (including anonymous users)

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Open roles viewable by everyone" ON public.project_open_roles;

-- Re-create the policy
CREATE POLICY "Open roles viewable by everyone" 
ON public.project_open_roles 
FOR SELECT 
USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.project_open_roles ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON public.project_open_roles TO anon, authenticated;
