-- ==============================================================================
-- MIGRATION 0007: MESSAGING SYSTEM
-- ==============================================================================

-- 1. CONVERSATIONS
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Participants
CREATE TABLE public.conversation_participants (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- 2. MESSAGES
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Optional if group chat
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- text, image, file
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    read_at TIMESTAMPTZ,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. MESSAGE REACTIONS
CREATE TABLE public.message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- 4. TYPING INDICATORS
CREATE TABLE public.typing_indicators (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- 5. CONVERSATION METADATA (Per user settings)
CREATE TABLE public.conversation_metadata (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_muted BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.conversation_metadata ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- Conversations
CREATE POLICY "Users view their conversations" ON public.conversations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
    );

-- Participants
CREATE POLICY "Users view participants of their conversations" ON public.conversation_participants
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid())
    );

-- Messages
CREATE POLICY "Users view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
    );
CREATE POLICY "Users send messages to their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
    );
CREATE POLICY "Users edit their own messages" ON public.messages
    FOR UPDATE USING (sender_id = auth.uid());
CREATE POLICY "Users delete their own messages" ON public.messages
    FOR DELETE USING (sender_id = auth.uid());

-- Reactions
CREATE POLICY "Users view reactions in their conversations" ON public.message_reactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.messages m 
                JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id 
                WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid())
    );
CREATE POLICY "Users react to messages" ON public.message_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove their reactions" ON public.message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Typing Indicators
CREATE POLICY "Users view typing in their conversations" ON public.typing_indicators
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = typing_indicators.conversation_id AND user_id = auth.uid())
    );
CREATE POLICY "Users update their typing status" ON public.typing_indicators
    FOR ALL USING (user_id = auth.uid());

-- Metadata
CREATE POLICY "Users manage their conversation metadata" ON public.conversation_metadata
    FOR ALL USING (user_id = auth.uid());

-- 7. RPC FUNCTIONS

-- Get Conversations with Metadata
CREATE OR REPLACE FUNCTION public.get_conversations_with_metadata(user_uuid UUID)
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
    is_archived BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        p.id as other_user_id,
        p.full_name as other_name,
        p.username as other_username,
        p.avatar_url as other_avatar,
        m.content as last_message,
        m.message_type as last_message_type,
        m.created_at as last_at,
        m.sender_id as last_sender_id,
        (SELECT COUNT(*) FROM public.messages msg 
         WHERE msg.conversation_id = c.id 
         AND msg.created_at > COALESCE(cm.last_read_at, '1970-01-01')
         AND msg.sender_id != user_uuid) as unread_count,
        COALESCE(cm.is_pinned, false) as is_pinned,
        COALESCE(cm.is_muted, false) as is_muted,
        COALESCE(cm.is_archived, false) as is_archived
    FROM public.conversations c
    JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id
    JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id
    JOIN public.profiles p ON cp2.user_id = p.id
    LEFT JOIN public.conversation_metadata cm ON c.id = cm.conversation_id AND cm.user_id = user_uuid
    LEFT JOIN LATERAL (
        SELECT content, message_type, created_at, sender_id
        FROM public.messages 
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) m ON true
    WHERE cp1.user_id = user_uuid 
    AND cp2.user_id != user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Messages with Details
CREATE OR REPLACE FUNCTION public.get_messages_with_details(conv_id UUID, limit_count INTEGER DEFAULT 50)
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
    sender_profile JSONB,
    reply_to JSONB,
    reactions JSONB
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
                'user_id', r.user_id
            ))
            FROM public.message_reactions r
            WHERE r.message_id = m.id),
            '[]'::jsonb
        ) as reactions
    FROM public.messages m
    JOIN public.profiles p ON m.sender_id = p.id
    LEFT JOIN public.messages rm ON m.reply_to_id = rm.id
    LEFT JOIN public.profiles rp ON rm.sender_id = rp.id
    WHERE m.conversation_id = conv_id
    ORDER BY m.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark Messages Read
CREATE OR REPLACE FUNCTION public.mark_messages_read(conv_id UUID, user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Update last_read_at in metadata
    INSERT INTO public.conversation_metadata (conversation_id, user_id, last_read_at)
    VALUES (conv_id, user_uuid, NOW())
    ON CONFLICT (conversation_id, user_id) 
    DO UPDATE SET last_read_at = NOW();

    -- Update read_at on messages
    UPDATE public.messages
    SET read_at = NOW()
    WHERE conversation_id = conv_id
    AND recipient_id = user_uuid
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ENABLE REALTIME
-- Enable realtime for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
