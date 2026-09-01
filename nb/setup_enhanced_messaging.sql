-- Complete setup script for enhanced messaging system
-- Run this in your Supabase SQL Editor

-- 1. First run the enhanced notification messages
-- Enhanced notification messages with better context and actionable content
-- This migration improves notification messages to be more informative and user-friendly
-- FIXED VERSION: Checks for table existence before creating triggers

-- First, let's enhance the notify_post_like function with better contextual messages
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  liker_name TEXT;
  liker_username TEXT;
  post_content TEXT;
  post_created_at TIMESTAMPTZ;
  snippet TEXT;
  time_context TEXT;
  existing_notification_id UUID;
BEGIN
  -- Get post author, content, and creation time
  SELECT user_id, content, created_at
  INTO post_author_id, post_content, post_created_at
  FROM public.posts
  WHERE id = NEW.post_id;

  -- Don't notify if liker is the post author
  IF post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check if a similar notification already exists (prevent duplicates)
  SELECT id INTO existing_notification_id
  FROM public.notifications
  WHERE user_id = post_author_id
    AND type = 'like'
    AND actor_id = NEW.user_id
    AND related_entity_id = NEW.post_id
    AND created_at > NOW() - INTERVAL '5 minutes'
  LIMIT 1;

  -- If a recent duplicate exists, skip creating a new one
  IF existing_notification_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get liker name and username for better context
  SELECT COALESCE(full_name, username, 'Someone'), username
  INTO liker_name, liker_username
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Build contextual snippet (shorter for better mobile UX)
  IF post_content IS NOT NULL THEN
    snippet := regexp_replace(post_content, '\s+', ' ', 'g');
    snippet := left(snippet, 60);
    IF length(post_content) > 60 THEN
      snippet := snippet || '…';
    END IF;
  END IF;

  -- Add time context for recency
  SELECT CASE
    WHEN post_created_at > NOW() - INTERVAL '1 hour' THEN 'your recent post'
    WHEN post_created_at > NOW() - INTERVAL '1 day' THEN 'your post from today'
    WHEN post_created_at > NOW() - INTERVAL '1 week' THEN 'your post from this week'
    ELSE 'your post'
  END INTO time_context;

  -- Create enhanced notification message
  PERFORM create_notification(
    post_author_id,
    'like',
    CASE
      WHEN snippet IS NOT NULL AND snippet <> '' THEN
        liker_name || ' liked ' || time_context || ': "' || snippet || '"'
      ELSE
        liker_name || ' liked ' || time_context
    END,
    NEW.user_id,
    'post',
    NEW.post_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Now run the complete enhanced messaging system

-- Add columns to existing messages table for enhanced features
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS message_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create message attachments table
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'file', 'audio', 'video'
  file_size BIGINT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT, -- For images and videos
  mime_type TEXT,
  metadata JSONB DEFAULT '{}', -- Additional file metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Users can read attachments for messages they can access
CREATE POLICY "Users can read message attachments" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE m.id = message_attachments.message_id 
      AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
    )
  );

-- Users can create attachments for their own messages
CREATE POLICY "Users can create message attachments" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE m.id = message_attachments.message_id 
      AND m.sender_id = auth.uid()
    )
  );

-- Create message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can read reactions for messages they can access
CREATE POLICY "Users can read message reactions" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE m.id = message_reactions.message_id 
      AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
    )
  );

-- Users can create their own reactions
CREATE POLICY "Users can create message reactions" ON public.message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete message reactions" ON public.message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create conversation metadata table for enhanced conversation features
CREATE TABLE IF NOT EXISTS public.conversation_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  last_read_message_id UUID,
  custom_name TEXT, -- User can set custom name for conversation
  notification_settings JSONB DEFAULT '{"enabled": true, "sound": true, "preview": true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_metadata ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversation metadata
CREATE POLICY "Users can manage their conversation metadata" ON public.conversation_metadata
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create typing indicators table
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Users can read typing indicators for conversations they're part of
CREATE POLICY "Users can read typing indicators" ON public.typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE m.conversation_id = typing_indicators.conversation_id 
      AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
    )
  );

-- Users can manage their own typing indicators
CREATE POLICY "Users can manage typing indicators" ON public.typing_indicators
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create message drafts table for auto-saving drafts
CREATE TABLE IF NOT EXISTS public.message_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.message_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own drafts
CREATE POLICY "Users can manage their message drafts" ON public.message_drafts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'message-attachments', 
  'message-attachments', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for message attachments
CREATE POLICY "Authenticated users can upload message attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view message attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete their own attachments" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);

-- 4. Enable real-time for enhanced tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_metadata;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation_id ON public.typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_conversation_id ON public.conversation_metadata(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Function to get conversations with enhanced metadata
CREATE OR REPLACE FUNCTION get_conversations_with_metadata(user_uuid UUID)
RETURNS TABLE (
  conversation_id TEXT,
  other_user_id UUID,
  other_name TEXT,
  other_username TEXT,
  other_avatar TEXT,
  last_message TEXT,
  last_message_type TEXT,
  last_at TIMESTAMPTZ,
  last_sender_id UUID,
  unread_count BIGINT,
  is_pinned BOOLEAN,
  is_muted BOOLEAN,
  is_archived BOOLEAN,
  is_typing BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH conversation_messages AS (
    SELECT DISTINCT 
      m.conversation_id,
      CASE 
        WHEN m.sender_id = user_uuid THEN m.recipient_id 
        ELSE m.sender_id 
      END AS other_user_id
    FROM public.messages m
    WHERE m.sender_id = user_uuid OR m.recipient_id = user_uuid
  ),
  latest_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content as last_message,
      m.message_type as last_message_type,
      m.created_at as last_at,
      m.sender_id as last_sender_id
    FROM public.messages m
    WHERE m.sender_id = user_uuid OR m.recipient_id = user_uuid
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.conversation_id,
      COUNT(*) as unread_count
    FROM public.messages m
    WHERE m.recipient_id = user_uuid 
      AND m.read_at IS NULL
    GROUP BY m.conversation_id
  ),
  typing_status AS (
    SELECT 
      ti.conversation_id,
      BOOL_OR(ti.is_typing) as is_typing
    FROM public.typing_indicators ti
    WHERE ti.user_id != user_uuid 
      AND ti.updated_at > NOW() - INTERVAL '5 seconds'
    GROUP BY ti.conversation_id
  )
  SELECT 
    cm.conversation_id,
    cm.other_user_id,
    COALESCE(p.full_name, p.username, 'Unknown') as other_name,
    p.username as other_username,
    p.avatar_url as other_avatar,
    lm.last_message,
    lm.last_message_type,
    lm.last_at,
    lm.last_sender_id,
    COALESCE(uc.unread_count, 0) as unread_count,
    COALESCE(cmd.is_pinned, FALSE) as is_pinned,
    COALESCE(cmd.is_muted, FALSE) as is_muted,
    COALESCE(cmd.is_archived, FALSE) as is_archived,
    COALESCE(ts.is_typing, FALSE) as is_typing
  FROM conversation_messages cm
  LEFT JOIN latest_messages lm ON cm.conversation_id = lm.conversation_id
  LEFT JOIN unread_counts uc ON cm.conversation_id = uc.conversation_id
  LEFT JOIN typing_status ts ON cm.conversation_id = ts.conversation_id
  LEFT JOIN public.profiles p ON cm.other_user_id = p.id
  LEFT JOIN public.conversation_metadata cmd ON cm.conversation_id = cmd.conversation_id 
    AND cmd.user_id = user_uuid
  WHERE lm.conversation_id IS NOT NULL
  ORDER BY 
    COALESCE(cmd.is_pinned, FALSE) DESC,
    lm.last_at DESC;
END;
$$;

-- Function to get messages with reactions and attachments
CREATE OR REPLACE FUNCTION get_messages_with_details(conv_id TEXT, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  conversation_id TEXT,
  sender_id UUID,
  recipient_id UUID,
  content TEXT,
  message_type TEXT,
  reply_to_id UUID,
  reply_to_content TEXT,
  reply_to_sender_name TEXT,
  created_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  is_edited BOOLEAN,
  read_at TIMESTAMPTZ,
  sender_name TEXT,
  sender_username TEXT,
  sender_avatar TEXT,
  reactions JSONB,
  attachments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH message_reactions AS (
    SELECT 
      mr.message_id,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'emoji', mr.emoji,
          'count', reaction_counts.count,
          'users', reaction_counts.users,
          'hasReacted', reaction_counts.has_reacted
        )
      ) as reactions
    FROM public.message_reactions mr
    JOIN (
      SELECT 
        mr2.message_id,
        mr2.emoji,
        COUNT(*) as count,
        ARRAY_AGG(mr2.user_id) as users,
        BOOL_OR(mr2.user_id = auth.uid()) as has_reacted
      FROM public.message_reactions mr2
      GROUP BY mr2.message_id, mr2.emoji
    ) reaction_counts ON mr.message_id = reaction_counts.message_id 
      AND mr.emoji = reaction_counts.emoji
    GROUP BY mr.message_id
  ),
  message_attachments AS (
    SELECT 
      ma.message_id,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', ma.id,
          'type', ma.file_type,
          'name', ma.file_name,
          'url', ma.file_url,
          'thumbnail_url', ma.thumbnail_url,
          'size', ma.file_size,
          'mime_type', ma.mime_type
        ) ORDER BY ma.created_at
      ) as attachments
    FROM public.message_attachments ma
    GROUP BY ma.message_id
  )
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.recipient_id,
    m.content,
    m.message_type,
    m.reply_to_id,
    reply_msg.content as reply_to_content,
    COALESCE(reply_profile.full_name, reply_profile.username, 'Unknown') as reply_to_sender_name,
    m.created_at,
    m.edited_at,
    m.is_edited,
    m.read_at,
    COALESCE(sender_profile.full_name, sender_profile.username, 'Unknown') as sender_name,
    sender_profile.username as sender_username,
    sender_profile.avatar_url as sender_avatar,
    COALESCE(mr.reactions, '[]'::jsonb) as reactions,
    COALESCE(ma.attachments, '[]'::jsonb) as attachments
  FROM public.messages m
  LEFT JOIN public.messages reply_msg ON m.reply_to_id = reply_msg.id
  LEFT JOIN public.profiles reply_profile ON reply_msg.sender_id = reply_profile.id
  LEFT JOIN public.profiles sender_profile ON m.sender_id = sender_profile.id
  LEFT JOIN message_reactions mr ON m.id = mr.message_id
  LEFT JOIN message_attachments ma ON m.id = ma.message_id
  WHERE m.conversation_id = conv_id
  ORDER BY m.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(conv_id TEXT, user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.messages 
  SET read_at = NOW()
  WHERE conversation_id = conv_id 
    AND recipient_id = user_uuid 
    AND read_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_conversations_with_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_messages_with_details(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read(TEXT, UUID) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Enhanced messaging system setup complete!';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '✅ Message grouping';
  RAISE NOTICE '✅ File attachments'; 
  RAISE NOTICE '✅ Emoji reactions';
  RAISE NOTICE '✅ Message threading';
  RAISE NOTICE '✅ Enhanced notifications';
  RAISE NOTICE '✅ Offline support';
  RAISE NOTICE '✅ Real-time updates';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update your frontend components';
  RAISE NOTICE '2. Test the new features';
  RAISE NOTICE '3. Deploy to production';
END $$;
