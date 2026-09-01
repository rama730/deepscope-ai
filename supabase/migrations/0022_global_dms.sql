-- Global DM Support
-- Requires: 0021_rebuild_messaging.sql

-- 1. RPC: Get User Conversations
-- Returns a list of conversations for the current user, including:
-- - last message content and time
-- - details of the OTHER user (name, avatar, etc.)
-- - project information for project conversations
-- This avoids N+1 queries on the client.

-- Drop existing function if it exists (needed when changing return type)
DROP FUNCTION IF EXISTS get_user_conversations(uuid);

CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  type text,
  updated_at timestamptz,
  last_message_content text,
  last_message_at timestamptz,
  other_user_id uuid,
  other_user_full_name text,
  other_user_avatar_url text,
  project_id uuid,
  project_title text,
  project_slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as conversation_id,
    c.type,
    c.updated_at,
    (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_content,
    (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
    other_profile.id as other_user_id,
    other_profile.full_name as other_user_full_name,
    other_profile.avatar_url as other_user_avatar_url,
    c.project_id,
    p.title as project_title,
    p.slug as project_slug
  FROM
    conversations c
  JOIN
    conversation_members cm_self ON c.id = cm_self.conversation_id
  LEFT JOIN
    conversation_members cm_other ON c.id = cm_other.conversation_id AND cm_other.user_id != p_user_id
  LEFT JOIN
    public.profiles other_profile ON cm_other.user_id = other_profile.id
  LEFT JOIN
    public.projects p ON c.project_id = p.id
  WHERE
    cm_self.user_id = p_user_id
    AND (c.type IN ('direct', 'project'))
  ORDER BY
    last_message_at DESC NULLS LAST;
END;
$$;

-- 2. RPC: Create Direct Conversation
-- Gets existing DM or creates new one.
CREATE OR REPLACE FUNCTION create_direct_conversation(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
  v_current_user_id uuid := auth.uid();
BEGIN
  -- Check if a direct conversation already exists between these two users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  JOIN conversation_members cm1 ON c.id = cm1.conversation_id
  JOIN conversation_members cm2 ON c.id = cm2.conversation_id
  WHERE c.type = 'direct'
  AND cm1.user_id = v_current_user_id
  AND cm2.user_id = p_other_user_id
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (type)
  VALUES ('direct')
  RETURNING id INTO v_conversation_id;

  -- Add members
  INSERT INTO conversation_members (conversation_id, user_id)
  VALUES
    (v_conversation_id, v_current_user_id),
    (v_conversation_id, p_other_user_id);

  RETURN v_conversation_id;
END;
$$;
