-- 1. Ensure all Project Detail Columns Exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS problem_statement TEXT,
ADD COLUMN IF NOT EXISTS solution_overview TEXT,
ADD COLUMN IF NOT EXISTS github_repository TEXT,
ADD COLUMN IF NOT EXISTS live_demo_url TEXT,
ADD COLUMN IF NOT EXISTS custom_project_type TEXT,
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- 2. Create the View Count Increment Function
CREATE OR REPLACE FUNCTION increment_project_view_count(project_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.projects
  SET view_count = view_count + 1
  WHERE id = project_id_param;
END;
$$;

-- 3. Grant Permissions for the Function
GRANT EXECUTE ON FUNCTION increment_project_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_project_view_count(UUID) TO anon;

-- 4. Fix Open Roles if necessary (ensure RLS allows reading)
DROP POLICY IF EXISTS "Anyone can view open roles" ON public.project_open_roles;
CREATE POLICY "Anyone can view open roles"
ON public.project_open_roles
FOR SELECT
USING (true);
