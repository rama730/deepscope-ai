
-- 1. Enhance notify_post_like function
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

  -- Check if a similar notification already exists
  SELECT id INTO existing_notification_id
  FROM public.notifications
  WHERE user_id = post_author_id
    AND type = 'like'
    AND actor_id = NEW.user_id
    AND related_entity_id = NEW.post_id
    AND created_at > NOW() - INTERVAL '5 minutes'
  LIMIT 1;

  IF existing_notification_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, username, 'Someone'), username
  INTO liker_name, liker_username
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF post_content IS NOT NULL THEN
    snippet := regexp_replace(post_content, '\s+', ' ', 'g');
    snippet := left(snippet, 60);
    IF length(post_content) > 60 THEN
      snippet := snippet || '…';
    END IF;
  END IF;

  SELECT CASE
    WHEN post_created_at > NOW() - INTERVAL '1 hour' THEN 'your recent post'
    WHEN post_created_at > NOW() - INTERVAL '1 day' THEN 'your post from today'
    WHEN post_created_at > NOW() - INTERVAL '1 week' THEN 'your post from this week'
    ELSE 'your post'
  END INTO time_context;

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

-- 2. Enhanced Messaging System

-- Add columns to public.messages if not exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_metadata JSONB DEFAULT '{}';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create message_attachments
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read message attachments" ON public.message_attachments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_attachments.message_id AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid()))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create message attachments" ON public.message_attachments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_attachments.message_id AND m.sender_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create message_reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read message reactions" ON public.message_reactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_reactions.message_id AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid()))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create message reactions" ON public.message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete message reactions" ON public.message_reactions FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create conversation_metadata
CREATE TABLE IF NOT EXISTS public.conversation_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  last_read_message_id UUID,
  custom_name TEXT,
  notification_settings JSONB DEFAULT '{"enabled": true, "sound": true, "preview": true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);
ALTER TABLE public.conversation_metadata ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage their conversation metadata" ON public.conversation_metadata FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create typing_indicators
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read typing indicators" ON public.typing_indicators FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = typing_indicators.conversation_id AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid()))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage typing indicators" ON public.typing_indicators FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create message_drafts
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

DO $$ BEGIN
  CREATE POLICY "Users can manage their message drafts" ON public.message_drafts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('message-attachments', 'message-attachments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- DO $$ BEGIN
--   CREATE POLICY "Authenticated users can upload message attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);
-- EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DO $$ BEGIN
--   CREATE POLICY "Users can view message attachments" ON storage.objects FOR SELECT USING (bucket_id = 'message-attachments');
-- EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DO $$ BEGIN
--   CREATE POLICY "Users can delete their own attachments" ON storage.objects FOR DELETE USING (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);
-- EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
-- Note: 'supabase_realtime' usually exists. We should ALTER it.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_metadata;

-- Ensure DELETE events contain full row data so filters (like conversation_id) work
ALTER TABLE public.messages REPLICA IDENTITY FULL;
-- Note: project_chat_messages might be in another migration, but if it exists, set it too.
DO $$ BEGIN
  ALTER TABLE public.project_chat_messages REPLICA IDENTITY FULL;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation_id ON public.typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_conversation_id ON public.conversation_metadata(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- RPC: get_conversations_with_metadata
DROP FUNCTION IF EXISTS get_conversations_with_metadata(UUID);

CREATE OR REPLACE FUNCTION get_conversations_with_metadata(user_uuid UUID)
RETURNS TABLE (
  conversation_id UUID,
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
LANGUAGE plpgsql security definer
AS $$
BEGIN
  RETURN QUERY
  WITH conversation_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      CASE WHEN m.sender_id = user_uuid THEN m.recipient_id ELSE m.sender_id END AS other_user_id
    FROM public.messages m
    WHERE m.sender_id = user_uuid OR m.recipient_id = user_uuid
    ORDER BY m.conversation_id, m.created_at DESC
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
    SELECT m.conversation_id, COUNT(*) as unread_count
    FROM public.messages m
    WHERE m.recipient_id = user_uuid AND m.read_at IS NULL
    GROUP BY m.conversation_id
  ),
  typing_status AS (
    SELECT ti.conversation_id::UUID, BOOL_OR(ti.is_typing) as is_typing
    FROM public.typing_indicators ti
    WHERE ti.user_id != user_uuid AND ti.updated_at > NOW() - INTERVAL '5 seconds'
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
  LEFT JOIN public.conversation_metadata cmd ON cm.conversation_id = cmd.conversation_id::UUID AND cmd.user_id = user_uuid
  WHERE lm.conversation_id IS NOT NULL
  ORDER BY COALESCE(cmd.is_pinned, FALSE) DESC, lm.last_at DESC;
END;
$$;

-- RPC: get_messages_with_details
DROP FUNCTION IF EXISTS get_messages_with_details(TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_messages_with_details(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_messages_with_details(conv_id UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
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
LANGUAGE plpgsql security definer
AS $$
BEGIN
  RETURN QUERY
  WITH message_reactions AS (
    SELECT 
      mr.message_id,
      JSONB_AGG(JSONB_BUILD_OBJECT('emoji', mr.emoji, 'count', rc.count, 'users', rc.users, 'hasReacted', rc.has_reacted)) as reactions
    FROM public.message_reactions mr
    JOIN (
      SELECT mr2.message_id, mr2.emoji, COUNT(*) as count, ARRAY_AGG(mr2.user_id) as users, BOOL_OR(mr2.user_id = auth.uid()) as has_reacted
      FROM public.message_reactions mr2
      GROUP BY mr2.message_id, mr2.emoji
    ) rc ON mr.message_id = rc.message_id AND mr.emoji = rc.emoji
    GROUP BY mr.message_id
  ),
  message_attachments AS (
    SELECT 
      ma.message_id,
      JSONB_AGG(JSONB_BUILD_OBJECT('id', ma.id, 'type', ma.file_type, 'name', ma.file_name, 'url', ma.file_url, 'thumbnail_url', ma.thumbnail_url, 'size', ma.file_size, 'mime_type', ma.mime_type) ORDER BY ma.created_at) as attachments
    FROM public.message_attachments ma
    GROUP BY ma.message_id
  )
  SELECT 
    m.id, m.conversation_id, m.sender_id, m.recipient_id, m.content, m.message_type, m.reply_to_id,
    reply_msg.content as reply_to_content,
    COALESCE(reply_profile.full_name, reply_profile.username, 'Unknown') as reply_to_sender_name,
    m.created_at, m.edited_at, m.is_edited, m.read_at,
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

-- RPC: mark_messages_read
DROP FUNCTION IF EXISTS mark_messages_read(TEXT, UUID);
DROP FUNCTION IF EXISTS mark_messages_read(UUID, UUID);

CREATE OR REPLACE FUNCTION mark_messages_read(conv_id UUID, user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql security definer
AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE public.messages SET read_at = NOW() WHERE conversation_id = conv_id AND recipient_id = user_uuid AND read_at IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_conversations_with_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_messages_with_details(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
