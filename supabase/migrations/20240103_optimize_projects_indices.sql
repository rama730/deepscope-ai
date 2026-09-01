-- Optimizing Hub Page Performance
-- Adding composite indices for common sort/filter patterns

-- 1. Index for "Newest" (Default View)
-- Filters by status (optional) and orders by created_at DESC
CREATE INDEX IF NOT EXISTS idx_projects_status_created_at 
ON public.projects (status, created_at DESC);

-- 2. Index for "Popular"
-- Filters by status and orders by view_count DESC
CREATE INDEX IF NOT EXISTS idx_projects_status_view_count 
ON public.projects (status, view_count DESC);

-- 3. Index for "Recent Activity"
-- Filters by status and orders by last_activity_at DESC
CREATE INDEX IF NOT EXISTS idx_projects_status_last_activity 
ON public.projects (status, last_activity_at DESC);

-- 4. Index for Technologies Filter (Array column)
-- Using GIN index for fast array containment queries (@> operator)
CREATE INDEX IF NOT EXISTS idx_projects_technologies_used 
ON public.projects USING GIN (technologies_used);

-- 5. Index for Project Type
CREATE INDEX IF NOT EXISTS idx_projects_project_type 
ON public.projects (project_type);

-- 6. Index for Title/Description Search (Trigram)
-- Assuming pg_trgm extension is enabled. If not, enable it:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_projects_search_trgm 
-- ON public.projects USING GIN (title gin_trgm_ops, description gin_trgm_ops, short_description gin_trgm_ops);
-- (Commented out to avoid extension dependency failure if not permitted, typical usage handles via ILIKE or separate implementation)
