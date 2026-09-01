-- ==============================================================================
-- MIGRATION: ENHANCED PROJECT CHAT (Parity with Direct Messages)
-- Purpose: Upgrade project_chat_messages to support threading, attachments, 
-- reactions, and read receipts. Includes automated cleanup for notifications.
-- ==============================================================================

-- 1. ENHANCE PROJECT CHAT MESSAGES TABLE
ALTER TABLE public.project_chat_messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.project_chat_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text', -- text, image, file, system
ADD COLUMN IF NOT EXISTS message_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_chat_reply_to ON public.project_chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_project_chat_task_id ON public.project_chat_messages(task_id);

-- 2. PROJECT CHAT ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.project_chat_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.project_chat_messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view chat attachments" ON public.project_chat_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_chat_messages m
            JOIN public.projects p ON m.project_id = p.id
            LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
            WHERE m.id = project_chat_attachments.message_id
            AND (p.creator_id = auth.uid() OR pc.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can upload their own attachments" ON public.project_chat_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_chat_messages m
            WHERE m.id = project_chat_attachments.message_id
            AND m.sender_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own attachments" ON public.project_chat_attachments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.project_chat_messages m
            WHERE m.id = project_chat_attachments.message_id
            AND m.sender_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_project_chat_attachments_message_id ON public.project_chat_attachments(message_id);

-- 3. PROJECT CHAT REACTIONS
CREATE TABLE IF NOT EXISTS public.project_chat_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.project_chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.project_chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view reactions" ON public.project_chat_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_chat_messages m
            JOIN public.projects p ON m.project_id = p.id
            LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
            WHERE m.id = project_chat_reactions.message_id
            AND (p.creator_id = auth.uid() OR pc.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can react" ON public.project_chat_reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions" ON public.project_chat_reactions
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_project_chat_reactions_message_id ON public.project_chat_reactions(message_id);

-- 4. PROJECT CHAT READ STATUS
CREATE TABLE IF NOT EXISTS public.project_chat_read_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_message_id UUID REFERENCES public.project_chat_messages(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_chat_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own read status" ON public.project_chat_read_status
    FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_project_chat_read_status_project_user ON public.project_chat_read_status(project_id, user_id);

-- 5. NOTIFICATION CLEANUP TRIGGER (The Safeguard)
CREATE OR REPLACE FUNCTION public.cleanup_orphan_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- If a Project is deleted, delete all related notifications
    IF (TG_TABLE_NAME = 'projects') THEN
        DELETE FROM public.notifications 
        WHERE related_entity_type = 'project' AND related_entity_id = OLD.id;
    END IF;

    -- If a Message (chat) is deleted, delete all related notifications
    IF (TG_TABLE_NAME = 'project_chat_messages') THEN
        DELETE FROM public.notifications 
        WHERE related_entity_type = 'project_message' AND related_entity_id = OLD.id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to Project Chat Messages
DROP TRIGGER IF EXISTS trigger_cleanup_project_chat_notifications ON public.project_chat_messages;
CREATE TRIGGER trigger_cleanup_project_chat_notifications
    AFTER DELETE ON public.project_chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.cleanup_orphan_notifications();

-- Apply trigger to Projects
DROP TRIGGER IF EXISTS trigger_cleanup_project_notifications ON public.projects;
CREATE TRIGGER trigger_cleanup_project_notifications
    AFTER DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.cleanup_orphan_notifications();


-- 6. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'project-attachments', 
  'project-attachments', 
  true,
  10485760, 
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Project members can view project attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'project-attachments');

CREATE POLICY "Authenticated users can upload project attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'project-attachments' AND auth.uid() IS NOT NULL);

-- 7. REALTIME
-- Safely add tables to publication only if they are not already present
DO $$
BEGIN
  -- project_chat_messages
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_messages;
  END IF;

  -- project_chat_reactions
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_chat_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_reactions;
  END IF;

  -- project_chat_attachments
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_chat_attachments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_attachments;
  END IF;
END
$$;
