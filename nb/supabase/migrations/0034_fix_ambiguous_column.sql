-- Migration 0034: Fix Ambiguous Column Reference
-- The function get_conversations_with_metadata had an ambiguous reference to 'conversation_id'.
-- This migration redefines it with fully qualified column names.

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
        SELECT msg.content, msg.message_type, msg.created_at, msg.sender_id
        FROM public.messages msg
        WHERE msg.conversation_id = c.id
        ORDER BY msg.created_at DESC
        LIMIT 1
    ) m ON true
    WHERE cp1.user_id = user_uuid 
    AND cp2.user_id != user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission again just to be safe
GRANT EXECUTE ON FUNCTION public.get_conversations_with_metadata(UUID) TO postgres, service_role, authenticated, anon;
