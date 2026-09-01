-- FIX RLS FOR EXPLORER (Posts, Projects, Open Roles)
-- Run this in Supabase SQL Editor

-- 1. POSTS TABLE
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Re-create policies
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;


-- 2. PROJECTS TABLE
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects are viewable by everyone" ON public.projects;
CREATE POLICY "Projects are viewable by everyone" ON public.projects FOR SELECT USING (true);

GRANT ALL ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;


-- 3. PROJECT OPEN ROLES
ALTER TABLE public.project_open_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open roles viewable by everyone" ON public.project_open_roles;
CREATE POLICY "Open roles viewable by everyone" ON public.project_open_roles FOR SELECT USING (true);

GRANT ALL ON public.project_open_roles TO authenticated;
GRANT SELECT ON public.project_open_roles TO anon;
