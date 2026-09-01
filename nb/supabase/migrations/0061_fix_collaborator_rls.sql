-- Fix RLS policies for adding/removing collaborators

-- Drop the ambiguous "FOR ALL" policy that might be failing for INSERTs
DROP POLICY IF EXISTS "Project creators manage collaborators" ON public.project_collaborators;

-- Create explicit policy for INSERT
-- "WITH CHECK" ensures the new row (specifically the project_id it points to) belongs to a project created by the auth user
CREATE POLICY "Project creators can add collaborators" ON public.project_collaborators
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id::text = project_id::text
            AND creator_id::text = auth.uid()::text
        )
    );

-- Create explicit policy for DELETE
-- "USING" ensures the row being deleted belongs to a project created by the auth user
CREATE POLICY "Project creators can remove collaborators" ON public.project_collaborators
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id::text = project_id::text
            AND creator_id::text = auth.uid()::text
        )
    );

-- Create explicit policy for UPDATE (e.g. changing roles)
CREATE POLICY "Project creators can update collaborators" ON public.project_collaborators
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id::text = project_id::text
            AND creator_id::text = auth.uid()::text
        )
    );
