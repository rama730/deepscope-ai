-- Migration 0054: Fix Reactions Realtime
-- 1. Updates get_messages_with_details to return aggregated reactions (emoji, count, users, hasReacted).
-- 2. Sets REPLICA IDENTITY FULL on message_reactions to allow frontend to handle DELETE events with full context.

-- 1. Update RPC
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
DECLARE
    current_user_id UUID := auth.uid();
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
        -- Build sender profile
        jsonb_build_object(
            'full_name', p.full_name,
            'username', p.username,
            'avatar_url', p.avatar_url
        ) as sender_profile,
        -- Build reply context
        CASE WHEN rm.id IS NOT NULL THEN
            jsonb_build_object(
                'id', rm.id,
                'content', rm.content,
                'sender_name', COALESCE(rp.full_name, rp.username, 'Unknown')
            )
        ELSE NULL END as reply_to,
        -- Aggregate reactions
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'emoji', r_agg.emoji,
                        'count', r_agg.count,
                        'users', r_agg.users,
                        'hasReacted', (r_agg.users ? current_user_id::text)
                    )
                )
                FROM (
                    SELECT 
                        emoji,
                        COUNT(*) as count,
                        jsonb_agg(user_id) as users
                    FROM public.message_reactions
                    WHERE message_id = m.id
                    GROUP BY emoji
                ) r_agg
            ),
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

GRANT EXECUTE ON FUNCTION public.get_messages_with_details(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_messages_with_details(UUID, INTEGER) TO service_role;

-- 2. Enable Full Replica Identity
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

NOTIFY pgrst, 'reload schema';
