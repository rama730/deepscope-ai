-- Fix: Enforce Project Membership Rule for Chat
-- Rule: "if any user is a member or creator, they can be joined in the project chat automatically."

CREATE OR REPLACE FUNCTION get_project_conversation(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
  v_user_id uuid := auth.uid();
  v_is_authorized boolean := false;
BEGIN
  -- 1. Check if Conversation exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE project_id = p_project_id AND type = 'project'
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    -- 2. Create if not exists
    INSERT INTO conversations (project_id, type)
    VALUES (p_project_id, 'project')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_conversation_id;

    -- Handle race condition
    IF v_conversation_id IS NULL THEN
       SELECT id INTO v_conversation_id
       FROM conversations
       WHERE project_id = p_project_id AND type = 'project'
       LIMIT 1;
    END IF;
  END IF;

  -- 3. CHECK AUTHORIZATION (The Rule)
  -- User must be Creator OR Collaborator
  SELECT EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN project_collaborators pc ON p.id = pc.project_id
    WHERE p.id = p_project_id
    AND (
      p.creator_id = v_user_id 
      OR 
      pc.user_id = v_user_id
    )
  ) INTO v_is_authorized;

  -- 4. JOIN if Authorized
  IF v_is_authorized THEN
    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES (v_conversation_id, v_user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN v_conversation_id;
END;
$$;
