-- Migration 0118: Add Message Search Functionality
-- Adds full-text search indexes and search function for messages

-- 1. Add GIN index for full-text search on messages.content
CREATE INDEX IF NOT EXISTS idx_messages_content_gin 
    ON public.messages USING gin(to_tsvector('english', content));

-- 2. Add index on created_at for date filtering
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
    ON public.messages(created_at DESC);

-- 3. Add index on sender_id for sender filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
    ON public.messages(sender_id);

-- 4. Add index on conversation_id for conversation filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
    ON public.messages(conversation_id);

-- 5. Add index on mentioned_task_ids for mention filtering
CREATE INDEX IF NOT EXISTS idx_messages_mentioned_tasks 
    ON public.messages USING gin(mentioned_task_ids);

-- 6. Drop old search_messages function if it exists (from migration 0059)
DROP FUNCTION IF EXISTS public.search_messages(UUID, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

-- 7. Create function to search messages with filters
CREATE OR REPLACE FUNCTION public.search_messages(
    p_user_id UUID,
    p_query TEXT DEFAULT NULL,
    p_conversation_id UUID DEFAULT NULL,
    p_sender_id UUID DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_has_attachments BOOLEAN DEFAULT NULL,
    p_has_mentions BOOLEAN DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    conversation_id UUID,
    sender_id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    sender_name TEXT,
    sender_avatar_url TEXT,
    conversation_name TEXT,
    conversation_type TEXT,
    has_attachments BOOLEAN,
    has_mentions BOOLEAN,
    relevance REAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH message_search AS (
        SELECT 
            m.id,
            m.conversation_id,
            m.sender_id,
            m.content,
            m.created_at,
            m.mentioned_task_ids,
            -- Check if message has attachments
            EXISTS (
                SELECT 1 FROM public.message_attachments ma 
                WHERE ma.message_id = m.id
            ) as has_attachments,
            -- Check if message has mentions
            (m.mentioned_task_ids IS NOT NULL AND array_length(m.mentioned_task_ids, 1) > 0) as has_mentions,
            -- Calculate relevance score for full-text search
            CASE 
                WHEN p_query IS NOT NULL AND p_query != '' THEN
                    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', p_query))
                ELSE 1.0
            END as relevance
        FROM public.messages m
        WHERE 
            -- User must be a participant in the conversation
            EXISTS (
                SELECT 1 FROM public.conversation_participants cp
                WHERE cp.conversation_id = m.conversation_id
                AND cp.user_id = p_user_id
            )
            -- Filter by conversation if specified
            AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
            -- Filter by sender if specified
            AND (p_sender_id IS NULL OR m.sender_id = p_sender_id)
            -- Filter by date range if specified
            AND (p_date_from IS NULL OR m.created_at >= p_date_from)
            AND (p_date_to IS NULL OR m.created_at <= p_date_to)
            -- Filter by attachments if specified
            AND (
                p_has_attachments IS NULL OR
                (p_has_attachments = TRUE AND EXISTS (
                    SELECT 1 FROM public.message_attachments ma 
                    WHERE ma.message_id = m.id
                )) OR
                (p_has_attachments = FALSE AND NOT EXISTS (
                    SELECT 1 FROM public.message_attachments ma 
                    WHERE ma.message_id = m.id
                ))
            )
            -- Filter by mentions if specified
            AND (
                p_has_mentions IS NULL OR
                (p_has_mentions = TRUE AND m.mentioned_task_ids IS NOT NULL AND array_length(m.mentioned_task_ids, 1) > 0) OR
                (p_has_mentions = FALSE AND (m.mentioned_task_ids IS NULL OR array_length(m.mentioned_task_ids, 1) = 0))
            )
            -- Full-text search if query provided
            AND (
                p_query IS NULL OR 
                p_query = '' OR
                to_tsvector('english', m.content) @@ plainto_tsquery('english', p_query)
            )
            -- Exclude deleted messages
            AND m.deleted_at IS NULL
    )
    SELECT 
        ms.id,
        ms.conversation_id,
        ms.sender_id,
        ms.content,
        ms.created_at,
        COALESCE(p.full_name, p.username, 'Unknown') as sender_name,
        p.avatar_url as sender_avatar_url,
        CASE 
            WHEN c.type = 'project' THEN pr.title
            WHEN c.type = 'group' THEN c.group_name
            ELSE COALESCE(other_p.full_name, other_p.username, 'Unknown')
        END as conversation_name,
        c.type::TEXT as conversation_type,
        ms.has_attachments,
        ms.has_mentions,
        ms.relevance
    FROM message_search ms
    INNER JOIN public.conversations c ON c.id = ms.conversation_id
    LEFT JOIN public.profiles p ON p.id = ms.sender_id
    LEFT JOIN public.projects pr ON pr.id = c.project_id
    LEFT JOIN public.conversation_participants cp_other ON 
        cp_other.conversation_id = ms.conversation_id 
        AND cp_other.user_id != p_user_id
        AND c.type = 'direct'
    LEFT JOIN public.profiles other_p ON other_p.id = cp_other.user_id
    ORDER BY ms.relevance DESC, ms.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 8. Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_messages(UUID, TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, BOOLEAN, INTEGER, INTEGER) TO authenticated;

-- 9. Add comment
COMMENT ON FUNCTION public.search_messages IS 'Search messages with full-text search and filters (conversation, sender, date, attachments, mentions)';
