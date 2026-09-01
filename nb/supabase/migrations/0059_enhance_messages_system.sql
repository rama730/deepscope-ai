-- ==============================================================================
-- MIGRATION 0059: ENHANCE MESSAGES SYSTEM
-- ==============================================================================

-- Add delivered_at timestamp for delivery status tracking
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS forwarded_from_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS forwarded_from_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON public.messages USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled ON public.messages(is_scheduled, scheduled_for) WHERE is_scheduled = TRUE;

-- Add group chat support to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS group_name TEXT,
ADD COLUMN IF NOT EXISTS group_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create scheduled messages processing function
CREATE OR REPLACE FUNCTION public.process_scheduled_messages()
RETURNS void AS $$
BEGIN
  -- Update scheduled messages that are ready to be sent
  UPDATE public.messages
  SET 
    is_scheduled = FALSE,
    scheduled_for = NULL,
    created_at = NOW()
  WHERE is_scheduled = TRUE 
    AND scheduled_for <= NOW()
    AND created_at > NOW() - INTERVAL '1 hour'; -- Prevent processing very old scheduled messages
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search messages with full-text search
CREATE OR REPLACE FUNCTION public.search_messages(
  search_user_id UUID,
  search_query TEXT,
  conv_filter UUID DEFAULT NULL,
  date_from TIMESTAMPTZ DEFAULT NULL,
  date_to TIMESTAMPTZ DEFAULT NULL,
  message_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ,
  sender_profile JSONB,
  conversation_name TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  WITH user_conversations AS (
    SELECT DISTINCT conversation_id
    FROM public.conversation_participants
    WHERE user_id = search_user_id
  ),
  search_results AS (
    SELECT 
      m.id,
      m.conversation_id,
      m.sender_id,
      m.content,
      m.message_type,
      m.created_at,
      jsonb_build_object(
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url
      ) as sender_profile,
      COALESCE(
        (SELECT string_agg(pp.full_name, ', ')
         FROM public.conversation_participants cp
         JOIN public.profiles pp ON cp.user_id = pp.id
         WHERE cp.conversation_id = m.conversation_id AND cp.user_id != search_user_id
         LIMIT 3),
        'Unknown'
      ) as conversation_name,
      ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_query)) as relevance
    FROM public.messages m
    JOIN user_conversations uc ON m.conversation_id = uc.conversation_id
    JOIN public.profiles p ON m.sender_id = p.id
    WHERE 
      (search_query IS NULL OR search_query = '' OR to_tsvector('english', m.content) @@ plainto_tsquery('english', search_query))
      AND (conv_filter IS NULL OR m.conversation_id = conv_filter)
      AND (date_from IS NULL OR m.created_at >= date_from)
      AND (date_to IS NULL OR m.created_at <= date_to)
      AND (message_type_filter IS NULL OR message_type_filter = 'all' OR m.message_type = message_type_filter)
  )
  SELECT * FROM search_results
  ORDER BY relevance DESC, created_at DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get messages with pagination
CREATE OR REPLACE FUNCTION public.get_messages_paginated(
  conv_id UUID,
  before_timestamp TIMESTAMPTZ DEFAULT NULL,
  page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  recipient_id UUID,
  content TEXT,
  message_type TEXT,
  reply_to_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  is_edited BOOLEAN,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  sender_profile JSONB,
  reply_to JSONB,
  reactions JSONB,
  attachments JSONB,
  is_pinned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.recipient_id,
    m.content,
    m.message_type,
    m.reply_to_id,
    m.created_at,
    m.updated_at,
    m.edited_at,
    m.is_edited,
    m.read_at,
    m.delivered_at,
    jsonb_build_object(
      'full_name', p.full_name,
      'username', p.username,
      'avatar_url', p.avatar_url
    ) as sender_profile,
    CASE WHEN rm.id IS NOT NULL THEN
      jsonb_build_object(
        'id', rm.id,
        'content', rm.content,
        'sender_name', rp.full_name
      )
    ELSE NULL END as reply_to,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'emoji', r.emoji,
        'user_id', r.user_id,
        'user_name', pr.full_name
      ))
      FROM public.message_reactions r
      JOIN public.profiles pr ON r.user_id = pr.id
      WHERE r.message_id = m.id),
      '[]'::jsonb
    ) as reactions,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'type', a.file_type,
        'url', a.file_url,
        'name', a.file_name,
        'size', a.file_size,
        'thumbnail_url', a.thumbnail_url
      ))
      FROM public.message_attachments a
      WHERE a.message_id = m.id),
      '[]'::jsonb
    ) as attachments,
    m.is_pinned
  FROM public.messages m
  JOIN public.profiles p ON m.sender_id = p.id
  LEFT JOIN public.messages rm ON m.reply_to_id = rm.id
  LEFT JOIN public.profiles rp ON rm.sender_id = rp.id
  WHERE m.conversation_id = conv_id
    AND (before_timestamp IS NULL OR m.created_at < before_timestamp)
  ORDER BY m.created_at DESC
  LIMIT page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update delivered_at when message is inserted (via trigger)
-- Note: In production, this should be updated when recipient's device actually receives the message
-- For now, we mark it as delivered when inserted, but this can be improved with client-side confirmation
CREATE OR REPLACE FUNCTION public.mark_message_delivered()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as delivered immediately after insertion
  -- In a real implementation, this would be updated via API when recipient's device confirms receipt
  IF NEW.delivered_at IS NULL THEN
    NEW.delivered_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS mark_message_delivered_trigger ON public.messages;

CREATE TRIGGER mark_message_delivered_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_message_delivered();
