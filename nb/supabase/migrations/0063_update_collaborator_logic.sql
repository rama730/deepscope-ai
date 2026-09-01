-- Updated function to handle specific roles and decrement counts
DROP FUNCTION IF EXISTS public.add_project_collaborator(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.add_project_collaborator(
    p_project_id uuid,
    p_user_id uuid,
    p_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_creator_id uuid;
BEGIN
    -- 1. Security Check: Verify the executing user is the creator of the project
    SELECT creator_id INTO v_creator_id
    FROM public.projects 
    WHERE id = p_project_id;

    -- Compare strictly strictly, referencing auth.uid() directly or casting if needed
    -- (We use the text comparison fallback we established earlier just to be safe, 
    -- though strictly in PLPGSQL variables it should be typed correctly)
    IF v_creator_id IS NULL OR v_creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Permission denied: Only the project creator can add collaborators.';
    END IF;

    -- 2. Decrement Open Role Count
    -- We attempt to find an open role with this name and decrement it.
    -- We don't fail if one doesn't exist (maybe they applied generally).
    UPDATE public.project_open_roles
    SET count = count - 1
    WHERE project_id = p_project_id
    AND role = p_role
    AND count > 0;

    -- 3. Perform the Insert with the specific Role Title
    INSERT INTO public.project_collaborators (project_id, user_id, role)
    VALUES (p_project_id, p_user_id, p_role)
    ON CONFLICT (project_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role;

    RETURN true;
END;
$$;
