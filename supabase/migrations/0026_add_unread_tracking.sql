-- Add Unread Message Tracking
-- Requires: 0022_global_dms.sql

-- Add last_read_at column to conversation_members to track when user last read messages
ALTER TABLE conversation_members 
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_conversation_members_last_read_at 
ON conversation_members(conversation_id, user_id, last_read_at);

-- Update get_user_conversations to include unread count
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
  project_slug text,
  unread_count bigint
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
    p.slug as project_slug,
    COALESCE((
      SELECT COUNT(*)
      FROM messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id != p_user_id
        AND m.created_at > COALESCE(cm_self.last_read_at, '1970-01-01'::timestamptz)
    ), 0)::bigint as unread_count
  FROM
    conversations c
  JOIN
    conversation_members cm_self ON c.id = cm_self.conversation_id AND cm_self.user_id = p_user_id
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

-- Function to mark messages as read for a conversation
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversation_members
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$;
