-- Migration 0036: Fix Duplicate Conversations
-- 1. Clean up existing duplicates
-- 2. Create get_or_create_conversation RPC

-- 1. Cleanup Duplicates
-- Find conversations with exactly 2 participants where duplicates exist
DO $$
DECLARE
    r RECORD;
    keep_id UUID;
BEGIN
    -- For each pair of users that have multiple conversations
    FOR r IN 
        SELECT p1.user_id as u1, p2.user_id as u2, count(*)
        FROM conversation_participants p1
        JOIN conversation_participants p2 ON p1.conversation_id = p2.conversation_id AND p1.user_id < p2.user_id
        GROUP BY p1.user_id, p2.user_id
        HAVING count(*) > 1
    LOOP
        -- Find the "best" conversation to keep (e.g. oldest one)
        SELECT p1.conversation_id INTO keep_id
        FROM conversation_participants p1
        JOIN conversation_participants p2 ON p1.conversation_id = p2.conversation_id
        WHERE p1.user_id = r.u1 AND p2.user_id = r.u2
        ORDER BY (SELECT created_at FROM conversations WHERE id = p1.conversation_id) ASC
        LIMIT 1;

        -- Delete the others
        DELETE FROM conversations
        WHERE id IN (
            SELECT p1.conversation_id
            FROM conversation_participants p1
            JOIN conversation_participants p2 ON p1.conversation_id = p2.conversation_id
            WHERE p1.user_id = r.u1 AND p2.user_id = r.u2
            AND p1.conversation_id != keep_id
        );
    END LOOP;
END $$;

-- 2. Create RPC to safely get or create conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(current_user_id UUID, target_user_id UUID)
RETURNS UUID AS $$
DECLARE
    conv_id UUID;
BEGIN
    -- Check if conversation exists
    SELECT p1.conversation_id INTO conv_id
    FROM conversation_participants p1
    JOIN conversation_participants p2 ON p1.conversation_id = p2.conversation_id
    WHERE p1.user_id = current_user_id AND p2.user_id = target_user_id
    LIMIT 1;

    -- If exists, return it
    IF conv_id IS NOT NULL THEN
        RETURN conv_id;
    END IF;

    -- If not, create new one
    INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conv_id;
    
    -- Add participants
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, current_user_id);
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, target_user_id);

    RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID) TO postgres, service_role, authenticated, anon;
