-- Migration 0037: Message Notifications
-- Create a trigger to insert a notification when a new message is sent.

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
BEGIN
    -- Get sender name
    SELECT full_name INTO sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    -- Insert notification for the recipient
    -- We only notify if it's a direct message (recipient_id is set)
    -- For group chats, we'd need to loop through participants, but for now we assume 1:1 or recipient_id is used.
    -- If recipient_id is NULL (group chat), we might need to look up participants.
    -- Based on the schema, recipient_id is nullable but usually set for 1:1.
    -- Let's assume 1:1 for now as per current UI.
    
    IF NEW.recipient_id IS NOT NULL AND NEW.recipient_id != NEW.sender_id THEN
        INSERT INTO public.notifications (
            user_id,
            actor_id,
            type,
            title,
            message,
            link,
            related_entity_type,
            related_entity_id
        )
        VALUES (
            NEW.recipient_id,
            NEW.sender_id,
            'message',
            COALESCE(sender_name, 'Someone'),
            'sent you a message',
            '/messages?userId=' || NEW.sender_id, -- Link to chat with sender
            'message',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_new_message ON public.messages;

-- Create trigger
CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();
