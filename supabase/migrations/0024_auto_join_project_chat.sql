-- Fix Project Chat Membership
-- Problem: Strict RLS prevents users from seeing the project chat because they aren't members.
-- Solution: Update get_project_conversation to auto-add the current user to the conversation.

CREATE OR REPLACE FUNCTION get_project_conversation(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- 1. Check if exists
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

  -- 3. Ensure User is a Member (Auto-Join)
  -- This is critical for RLS to work
  IF v_user_id IS NOT NULL THEN
    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES (v_conversation_id, v_user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN v_conversation_id;
END;
$$;
