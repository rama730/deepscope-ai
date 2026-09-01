-- Add 24-hour cooldown for re-applying after rejection/withdrawal
-- This prevents spamming applications to the same project.

CREATE OR REPLACE FUNCTION public.apply_to_project(
    p_project_id UUID,
    p_user_id UUID,
    p_role_name TEXT,
    p_message TEXT,
    p_work_timings TEXT DEFAULT NULL,
    p_portfolio_link TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_creator_id UUID;
    v_project_slug TEXT;
    v_project_title TEXT;
    v_application_id UUID;
    v_conversation_id UUID;
    v_project_token TEXT;
    v_role_slug TEXT;
    v_text_message TEXT;
    v_existing_status TEXT;
BEGIN
    -- 1. Get project details and validate
    SELECT creator_id, slug, title INTO v_creator_id, v_project_slug, v_project_title
    FROM public.projects
    WHERE id = p_project_id;

    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'Project not found';
    END IF;

    IF v_creator_id = p_user_id THEN
        RAISE EXCEPTION 'Cannot apply to your own project';
    END IF;

    -- 2. Check for existing applications (Idempotency Check)
    SELECT id, conversation_id, status INTO v_application_id, v_conversation_id, v_existing_status
    FROM public.project_applications
    WHERE project_id = p_project_id AND applicant_id = p_user_id AND status IN ('pending', 'accepted')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_application_id IS NOT NULL THEN
        -- Link conversation if missing (e.g. from old data)
        IF v_conversation_id IS NULL THEN
             SELECT public.get_or_create_conversation(p_user_id, v_creator_id) INTO v_conversation_id;
             UPDATE public.project_applications 
             SET conversation_id = v_conversation_id 
             WHERE id = v_application_id;
        END IF;

        RETURN jsonb_build_object(
            'application_id', v_application_id,
            'conversation_id', v_conversation_id,
            'status', v_existing_status,
            'is_duplicate', true
        );
    END IF;

    -- 3. Spam Control: 24-hour cooldown check for rejected/withdrawn applications
    IF EXISTS (
        SELECT 1 FROM public.project_applications
        WHERE project_id = p_project_id 
          AND applicant_id = p_user_id 
          AND status IN ('rejected', 'withdrawn')
          AND created_at > (now() - interval '24 hours')
    ) THEN
        RAISE EXCEPTION 'Please wait 24 hours before reapplying to this project.';
    END IF;

    -- 4. Find or Create Direct Conversation
    SELECT public.get_or_create_conversation(p_user_id, v_creator_id)
    INTO v_conversation_id;

    -- 5. Create Application
    INSERT INTO public.project_applications (
        project_id,
        applicant_id,
        role_applied_for,
        message,
        work_timings,
        portfolio_link,
        conversation_id,
        status
    ) VALUES (
        p_project_id,
        p_user_id,
        p_role_name,
        p_message,
        p_work_timings,
        p_portfolio_link,
        v_conversation_id,
        'pending'
    ) RETURNING id INTO v_application_id;

    -- 6. Send a normal text message into the conversation
    v_project_token := COALESCE(NULLIF(v_project_slug, ''), p_project_id::text);
    v_role_slug := trim(both '-' from regexp_replace(lower(COALESCE(p_role_name, '')), '[^a-z0-9]+', '-', 'g'));
    v_text_message := '/' || v_project_token || ' #' || COALESCE(NULLIF(v_role_slug, ''), 'role') || ' ' || p_message;

    INSERT INTO public.messages (
        conversation_id, sender_id, recipient_id, content, message_type
    ) VALUES (
        v_conversation_id, p_user_id, v_creator_id, v_text_message, 'text'
    );

    RETURN jsonb_build_object(
        'application_id', v_application_id,
        'conversation_id', v_conversation_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
