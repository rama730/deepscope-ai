-- Migration 0121: Enhance Message Notifications
-- Update the message notification trigger to support group conversations,
-- include conversation metadata, and use conversation-based links

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP FUNCTION IF EXISTS public.handle_new_message();

-- Create enhanced function that supports both direct and group conversations
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    sender_username TEXT;
    conversation_type TEXT;
    conversation_name TEXT;
    is_group BOOLEAN;
    participant_id UUID;
    message_preview TEXT;
    notification_metadata JSONB;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Get sender information
    SELECT full_name, username INTO sender_name, sender_username
    FROM public.profiles
    WHERE id = NEW.sender_id;

    -- Get conversation details
    SELECT 
        COALESCE(c.type, 'direct')::TEXT,
        c.group_name,
        COALESCE(c.is_group, FALSE)
    INTO conversation_type, conversation_name, is_group
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

    -- Default to 'direct' if conversation type is NULL
    IF conversation_type IS NULL THEN
        conversation_type := 'direct';
    END IF;

    -- Create message preview (first 100 characters)
    message_preview := LEFT(NEW.content, 100);

    -- Build notification metadata
    notification_metadata := jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'conversation_type', conversation_type,
        'conversation_name', conversation_name,
        'message_preview', message_preview,
        'is_group', is_group
    );

    -- Notify all participants except sender
    -- Use conversation_participants to determine recipients (works for both direct and group chats)
    FOR participant_id IN
        SELECT cp.user_id
        FROM public.conversation_participants cp
        WHERE cp.conversation_id = NEW.conversation_id
        AND cp.user_id != NEW.sender_id
    LOOP
        BEGIN
            -- Determine notification message based on conversation type
            IF (conversation_type = 'group' OR is_group = TRUE) THEN
                -- Group conversation
                notification_title := COALESCE(sender_name, sender_username, 'Someone');
                notification_message := COALESCE(
                    conversation_name || ': ' || message_preview,
                    conversation_name || ' sent a message',
                    'sent a message in ' || COALESCE(conversation_name, 'group')
                );
            ELSE
                -- Direct conversation
                notification_title := COALESCE(sender_name, sender_username, 'Someone');
                notification_message := COALESCE(message_preview, 'sent you a message');
            END IF;
            
            INSERT INTO public.notifications (
                user_id,
                actor_id,
                type,
                title,
                message,
                link,
                related_entity_type,
                related_entity_id,
                metadata
            )
            VALUES (
                participant_id,
                NEW.sender_id,
                'message',
                notification_title,
                notification_message,
                '/messages?conversationId=' || NEW.conversation_id,
                'message',
                NEW.id,
                notification_metadata
            );
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the message insert
            RAISE WARNING 'Failed to create notification for participant % in message %: %', participant_id, NEW.id, SQLERRM;
        END;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();

-- Add metadata column to notifications table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN metadata JSONB;
    END IF;
END $$;
