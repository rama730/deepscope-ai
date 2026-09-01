-- Fix RLS for project_collaborators to ensure it can be read during policy checks
DROP POLICY IF EXISTS "Collaborators viewable by everyone" ON public.project_collaborators;
CREATE POLICY "Collaborators viewable by everyone"
ON public.project_collaborators FOR SELECT
USING (true);

-- Fix RLS for project_tasks to ensure members can create tasks
DROP POLICY IF EXISTS "Project tasks manageable by members" ON public.project_tasks;

-- Split into separate policies for better control
CREATE POLICY "Tasks visible to members and creators"
ON public.project_tasks FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid())
);

CREATE POLICY "Tasks insertable by members and creators"
ON public.project_tasks FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid())
);

CREATE POLICY "Tasks updatable by members and creators"
ON public.project_tasks FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid())
);

CREATE POLICY "Tasks deletable by members and creators"
ON public.project_tasks FOR DELETE
USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid())
);
