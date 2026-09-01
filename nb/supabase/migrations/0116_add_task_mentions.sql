-- Migration 0116: Add Task Mentions in Messages
-- Enables mentioning tasks in messages with proper linking

-- 1. Add mentioned_task_ids column to messages table (for direct messages)
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS mentioned_task_ids UUID[] DEFAULT '{}';

-- 2. Add mentioned_task_ids column to project_chat_messages (if not already exists via linked_task_id)
-- Note: project_chat_messages already has linked_task_id, but we'll add array support for multiple mentions
ALTER TABLE public.project_chat_messages
    ADD COLUMN IF NOT EXISTS mentioned_task_ids UUID[] DEFAULT '{}';

-- 3. Create junction table for many-to-many relationship (more flexible)
CREATE TABLE IF NOT EXISTS public.message_task_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    project_chat_message_id UUID REFERENCES public.project_chat_messages(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Ensure only one of message_id or project_chat_message_id is set
    CHECK (
        (message_id IS NULL AND project_chat_message_id IS NOT NULL) OR
        (message_id IS NOT NULL AND project_chat_message_id IS NULL)
    )
);

-- 4. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_message_task_mentions_message_id ON public.message_task_mentions(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_task_mentions_project_chat_message_id ON public.message_task_mentions(project_chat_message_id) WHERE project_chat_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_task_mentions_task_id ON public.message_task_mentions(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_mentioned_tasks ON public.messages USING GIN(mentioned_task_ids) WHERE array_length(mentioned_task_ids, 1) > 0;
CREATE INDEX IF NOT EXISTS idx_project_chat_mentioned_tasks ON public.project_chat_messages USING GIN(mentioned_task_ids) WHERE array_length(mentioned_task_ids, 1) > 0;

-- Create unique index to prevent duplicate task mentions
-- This ensures a task can only be mentioned once per message (either regular or project chat)
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_task_mentions_unique 
    ON public.message_task_mentions (
        COALESCE(message_id, '00000000-0000-0000-0000-000000000000'::UUID),
        COALESCE(project_chat_message_id, '00000000-0000-0000-0000-000000000000'::UUID),
        task_id
    );

-- 5. Enable RLS
ALTER TABLE public.message_task_mentions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for message_task_mentions
-- Users can view task mentions in messages they can access
CREATE POLICY "Users can view task mentions in accessible messages"
    ON public.message_task_mentions
    FOR SELECT
    USING (
        -- For regular messages
        (message_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_task_mentions.message_id
            AND cp.user_id = auth.uid()
        ))
        OR
        -- For project chat messages
        (project_chat_message_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.project_chat_messages pcm
            JOIN public.project_collaborators pc ON pcm.project_id = pc.project_id
            WHERE pcm.id = message_task_mentions.project_chat_message_id
            AND pc.user_id = auth.uid()
        ))
    );

-- Users can create task mentions when sending messages
CREATE POLICY "Users can create task mentions"
    ON public.message_task_mentions
    FOR INSERT
    WITH CHECK (
        -- Must be a project member to mention tasks
        EXISTS (
            SELECT 1 FROM public.project_tasks pt
            JOIN public.project_collaborators pc ON pt.project_id = pc.project_id
            WHERE pt.id = message_task_mentions.task_id
            AND pc.user_id = auth.uid()
        )
    );

-- 7. Grant permissions
GRANT ALL ON TABLE public.message_task_mentions TO authenticated;
-- Note: No sequence grant needed - UUID primary keys use uuid_generate_v4(), not sequences

-- 8. Enable real-time for task mentions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_task_mentions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_task_mentions;
  END IF;
END
$$;

-- 9. Set REPLICA IDENTITY FULL
ALTER TABLE public.message_task_mentions REPLICA IDENTITY FULL;
