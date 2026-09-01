-- Create function to get user conversations with pagination
CREATE OR REPLACE FUNCTION public.get_user_conversations_paginated(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  conversation_id UUID,
  type TEXT,
  project_id UUID,
  project_title TEXT,
  other_user_id UUID,
  other_user_full_name TEXT,
  other_name TEXT,
  other_username TEXT,
  other_user_avatar_url TEXT,
  avatar_url TEXT,
  unread_count BIGINT,
  last_message_content TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  last_at TIMESTAMPTZ,
  last_sender_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH user_convs AS (
    SELECT cp.conversation_id
    FROM public.conversation_participants cp
    WHERE cp.user_id = p_user_id
  ),
  conv_details AS (
    SELECT 
      c.id,
      c.type,
      c.project_id,
      c.group_name,
      c.group_avatar_url,
      c.created_at
    FROM public.conversations c
    JOIN user_convs uc ON c.id = uc.conversation_id
  ),
  last_msgs AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.created_at as sent_at,
      m.sender_id
    FROM public.messages m
    JOIN user_convs uc ON m.conversation_id = uc.conversation_id
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.conversation_id,
      COUNT(*) as count
    FROM public.messages m
    JOIN user_convs uc ON m.conversation_id = uc.conversation_id
    WHERE m.read_at IS NULL 
      AND m.sender_id != p_user_id
    GROUP BY m.conversation_id
  ),
  other_participants AS (
    SELECT DISTINCT ON (cp.conversation_id)
      cp.conversation_id,
      p.id as user_id,
      p.full_name,
      p.username,
      p.avatar_url
    FROM public.conversation_participants cp
    JOIN public.profiles p ON cp.user_id = p.id
    WHERE cp.user_id != p_user_id
    -- For DMs, this gets the other user. For groups, it gets one of them randomly (or based on creation order)
  ),
  projects_info AS (
    SELECT 
        pr.id,
        pr.title
    FROM public.projects pr
  )
  SELECT 
    cd.id as conversation_id,
    cd.type::text,
    cd.project_id,
    pi.title as project_title,
    op.user_id as other_user_id,
    op.full_name as other_user_full_name,
    CASE 
      WHEN cd.type = 'group' THEN COALESCE(cd.group_name, 'Group Chat')
      WHEN cd.type = 'project' THEN COALESCE(pi.title, 'Project Chat')
      ELSE COALESCE(op.full_name, op.username)
    END as other_name,
    op.username as other_username,
    op.avatar_url as other_user_avatar_url,
    CASE 
      WHEN cd.type = 'direct' THEN op.avatar_url
      ELSE COALESCE(cd.group_avatar_url, op.avatar_url)
    END as avatar_url,
    COALESCE(uc.count, 0) as unread_count,
    lm.content as last_message_content,
    lm.content as last_message,
    lm.sent_at as last_message_at,
    lm.sent_at as last_at,
    lm.sender_id as last_sender_id,
    cd.created_at
  FROM conv_details cd
  LEFT JOIN last_msgs lm ON cd.id = lm.conversation_id
  LEFT JOIN unread_counts uc ON cd.id = uc.conversation_id
  LEFT JOIN other_participants op ON cd.id = op.conversation_id
  LEFT JOIN projects_info pi ON cd.project_id = pi.id
  ORDER BY lm.sent_at DESC NULLS LAST, cd.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
