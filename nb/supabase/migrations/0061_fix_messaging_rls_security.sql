-- ==============================================================================
-- MIGRATION 0061: FIX MESSAGING RLS SECURITY
-- ==============================================================================
-- Re-enable RLS with proper security policies

-- 1. Re-enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 2. Re-enable RLS on conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS on conversation_metadata
ALTER TABLE public.conversation_metadata ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users manage their conversation metadata" ON public.conversation_metadata;

-- 5. Create secure RLS policies for conversations
CREATE POLICY "Users view their conversations" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants 
            WHERE conversation_id = conversations.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users create conversations" ON public.conversations
    FOR INSERT WITH CHECK (true); -- Creation handled by RPC function

-- 6. Create secure RLS policies for conversation_participants
CREATE POLICY "Users view participants of their conversations" ON public.conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp 
            WHERE cp.conversation_id = conversation_participants.conversation_id 
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users add participants" ON public.conversation_participants
    FOR INSERT WITH CHECK (
        -- Only allow if user is already a participant (for group chats)
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- 7. Create secure RLS policies for conversation_metadata
CREATE POLICY "Users manage their conversation metadata" ON public.conversation_metadata
    FOR ALL USING (user_id = auth.uid());

-- 8. Ensure messages RLS is properly configured
-- Messages policies should already exist from migration 0007, but verify
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'Users view messages in their conversations'
    ) THEN
        CREATE POLICY "Users view messages in their conversations" ON public.messages
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.conversation_participants 
                    WHERE conversation_id = messages.conversation_id 
                    AND user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'Users send messages to their conversations'
    ) THEN
        CREATE POLICY "Users send messages to their conversations" ON public.messages
            FOR INSERT WITH CHECK (
                sender_id = auth.uid() AND
                EXISTS (
                    SELECT 1 FROM public.conversation_participants 
                    WHERE conversation_id = messages.conversation_id 
                    AND user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 9. Ensure message_reactions RLS is properly configured
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'message_reactions' 
        AND policyname = 'Users view reactions in their conversations'
    ) THEN
        CREATE POLICY "Users view reactions in their conversations" ON public.message_reactions
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.messages m 
                    JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id 
                    WHERE m.id = message_reactions.message_id 
                    AND cp.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'message_reactions' 
        AND policyname = 'Users react to messages'
    ) THEN
        CREATE POLICY "Users react to messages" ON public.message_reactions
            FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'message_reactions' 
        AND policyname = 'Users remove their reactions'
    ) THEN
        CREATE POLICY "Users remove their reactions" ON public.message_reactions
            FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- 10. Ensure message_attachments RLS is properly configured
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'message_attachments'
    ) THEN
        -- Create message_attachments table if it doesn't exist
        CREATE TABLE public.message_attachments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_url TEXT NOT NULL,
            file_size BIGINT,
            thumbnail_url TEXT,
            mime_type TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;

    ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'message_attachments' 
        AND policyname = 'Users view attachments in their conversations'
    ) THEN
        CREATE POLICY "Users view attachments in their conversations" ON public.message_attachments
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.messages m 
                    JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id 
                    WHERE m.id = message_attachments.message_id 
                    AND cp.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'message_attachments' 
        AND policyname = 'Users add attachments to their messages'
    ) THEN
        CREATE POLICY "Users add attachments to their messages" ON public.message_attachments
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.messages m
                    WHERE m.id = message_attachments.message_id
                    AND m.sender_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 11. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON public.message_attachments(message_id);
