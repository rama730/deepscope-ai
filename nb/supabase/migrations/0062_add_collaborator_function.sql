-- Function to securely add a collaborator
-- Bypasses RLS by using SECURITY DEFINER, but implements its own strict check
CREATE OR REPLACE FUNCTION public.add_project_collaborator(
    p_project_id uuid,
    p_user_id uuid,
    p_role text DEFAULT 'member'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Security Check: Verify the executing user is the creator of the project
    IF NOT EXISTS (
        SELECT 1 
        FROM public.projects 
        WHERE id = p_project_id 
        AND creator_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Permission denied: Only the project creator can add collaborators.';
    END IF;

    -- 2. Perform the Insert
    INSERT INTO public.project_collaborators (project_id, user_id, role)
    VALUES (p_project_id, p_user_id, p_role)
    ON CONFLICT (project_id, user_id) DO NOTHING;

    RETURN true;
END;
$$;
