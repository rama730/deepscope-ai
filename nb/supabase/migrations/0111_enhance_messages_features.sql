-- Enhance Messages Features
-- Adds support for editing, deletion, replies, attachments, and reactions
-- Requires: 0021_rebuild_messaging.sql

-- 1. Add columns to messages table if they don't exist
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_edited ON public.messages(is_edited) WHERE is_edited = TRUE;

-- 3. RLS Policies for UPDATE (edit own messages)
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (
    sender_id = auth.uid() 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    sender_id = auth.uid() 
    AND deleted_at IS NULL
  );

-- 4. RLS Policies for DELETE (hard delete own messages)
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- 5. Ensure message_attachments table exists
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- RLS for message_attachments
DROP POLICY IF EXISTS "Users can view message attachments in their conversations" ON public.message_attachments;
CREATE POLICY "Users can view message attachments in their conversations"
  ON public.message_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON m.conversation_id = cm.conversation_id
      WHERE m.id = message_attachments.message_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create message attachments for their messages" ON public.message_attachments;
CREATE POLICY "Users can create message attachments for their messages"
  ON public.message_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own message attachments" ON public.message_attachments;
CREATE POLICY "Users can delete their own message attachments"
  ON public.message_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
    )
  );

-- Index for message_attachments
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);

-- Grant permissions for message_attachments (required even with RLS)
GRANT ALL ON TABLE public.message_attachments TO authenticated;

-- 6. Ensure message_reactions table exists
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS for message_reactions
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their conversations"
  ON public.message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON m.conversation_id = cm.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add reactions to messages" ON public.message_reactions;
CREATE POLICY "Users can add reactions to messages"
  ON public.message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON m.conversation_id = cm.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;
CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Index for message_reactions
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Grant permissions for message_reactions (required even with RLS)
GRANT ALL ON TABLE public.message_reactions TO authenticated;

-- 7. Enable realtime for UPDATE and DELETE events on messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;

-- Enable realtime for message_reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END
$$;

-- Enable realtime for message_attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;
  END IF;
END
$$;

-- 8. Ensure message-attachments storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY[
    -- Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
    -- Documents
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/flac',
    -- Video (including QuickTime)
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    'video/avi', 'video/mov', 'video/ogg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message attachments
DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view message attachments" ON storage.objects;
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-attachments' AND auth.uid() = owner);

-- 9. Ensure REPLICA IDENTITY FULL is set for messages table to support DELETE events in realtime
-- This allows Supabase realtime to send the full old record on DELETE events
ALTER TABLE public.messages REPLICA IDENTITY FULL;
