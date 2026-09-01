-- Add terms_and_conditions column if it doesn't exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Re-verify other columns just in case
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS problem_statement TEXT,
ADD COLUMN IF NOT EXISTS solution_overview TEXT,
ADD COLUMN IF NOT EXISTS github_repository TEXT,
ADD COLUMN IF NOT EXISTS live_demo_url TEXT,
ADD COLUMN IF NOT EXISTS custom_project_type TEXT;
