-- Migration 0148: Fix Orphan Conversations and Harden RPC
-- This migration fixes the "violates foreign key constraint" error by:
-- 1. Cleaning up orphan rows in conversation_participants that point to non-existent conversations.
-- 2. Updating get_or_create_conversation to strictly check for conversation existence.

-- 1. Cleanup Orphans
-- Delete participants where calculation fails (conversation_id not in conversations)
DELETE FROM public.conversation_participants
WHERE conversation_id NOT IN (SELECT id FROM public.conversations);

-- 2. Harden get_or_create_conversation
-- We redefine the function to ensure it joins with the conversations table.
-- This guarantees it only returns a conversation_id if the conversation actually exists.

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(current_user_id UUID, target_user_id UUID)
RETURNS UUID AS $$
DECLARE
    conv_id UUID;
BEGIN
    -- Check if conversation exists AND is valid (exists in conversations table)
    SELECT p1.conversation_id INTO conv_id
    FROM conversation_participants p1
    JOIN conversation_participants p2 ON p1.conversation_id = p2.conversation_id
    JOIN conversations c ON p1.conversation_id = c.id
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
