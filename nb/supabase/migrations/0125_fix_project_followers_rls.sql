-- Fix RLS policies for Hub counts (followers, collaborators, open roles)
-- Re-applying policies to ensure public read access is enabled.

-- 1. Project Followers
ALTER TABLE public.project_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project followers viewable by everyone" ON public.project_followers;
CREATE POLICY "Project followers viewable by everyone" ON public.project_followers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow projects" ON public.project_followers;
CREATE POLICY "Users can follow projects" ON public.project_followers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unfollow projects" ON public.project_followers;
CREATE POLICY "Users can unfollow projects" ON public.project_followers FOR DELETE USING (auth.uid() = user_id);

-- 2. Project Collaborators
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collaborators viewable by everyone" ON public.project_collaborators;
CREATE POLICY "Collaborators viewable by everyone" ON public.project_collaborators FOR SELECT USING (true);

DROP POLICY IF EXISTS "Project creators manage collaborators" ON public.project_collaborators;
CREATE POLICY "Project creators manage collaborators" ON public.project_collaborators FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_collaborators.project_id AND creator_id = auth.uid())
);

-- 3. Project Open Roles
ALTER TABLE public.project_open_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open roles viewable by everyone" ON public.project_open_roles;
CREATE POLICY "Open roles viewable by everyone" ON public.project_open_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators manage open roles" ON public.project_open_roles;
CREATE POLICY "Creators manage open roles" ON public.project_open_roles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_open_roles.project_id AND creator_id = auth.uid())
);
