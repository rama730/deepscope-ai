-- Migration to fix notification triggers by adding error handling
-- This ensures that if a notification fails to send, the original action (connection, like, comment) still succeeds.

-- 1. Function to handle new connection requests (SAFE)
CREATE OR REPLACE FUNCTION handle_new_connection_request()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        IF NEW.status = 'pending' THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                link,
                actor_id,
                related_entity_type,
                related_entity_id,
                created_at
            ) VALUES (
                NEW.connected_user_id,
                'connection_request',
                'New Connection Request',
                'sent you a connection request',
                '/people/invitations',
                NEW.user_id,
                'connection',
                NEW.id,
                NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Swallow error to prevent blocking the connection request
        RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to handle accepted connections (SAFE)
CREATE OR REPLACE FUNCTION handle_connection_accepted()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                link,
                actor_id,
                related_entity_type,
                related_entity_id,
                created_at
            ) VALUES (
                NEW.user_id,
                'connection_accepted',
                'Connection Accepted',
                'accepted your connection request',
                '/profile/' || NEW.connected_user_id,
                NEW.connected_user_id,
                'connection',
                NEW.id,
                NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to handle new likes (SAFE)
CREATE OR REPLACE FUNCTION handle_new_like()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
    post_content TEXT;
BEGIN
    BEGIN
        -- Get post owner and content
        SELECT user_id, content INTO post_owner_id, post_content
        FROM public.posts
        WHERE id = NEW.post_id;

        -- Don't notify if user likes their own post
        IF post_owner_id != NEW.user_id THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                link,
                actor_id,
                related_entity_type,
                related_entity_id,
                created_at
            ) VALUES (
                post_owner_id,
                'like',
                'New Like',
                'liked your post',
                '/post/' || NEW.post_id,
                NEW.user_id,
                'post',
                NEW.post_id,
                NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to handle new comments (SAFE)
CREATE OR REPLACE FUNCTION handle_new_comment()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
    post_content TEXT;
BEGIN
    BEGIN
        -- Get post owner
        SELECT user_id INTO post_owner_id
        FROM public.posts
        WHERE id = NEW.post_id;

        -- Don't notify if user comments on their own post
        IF post_owner_id != NEW.user_id THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                link,
                actor_id,
                related_entity_type,
                related_entity_id,
                created_at
            ) VALUES (
                post_owner_id,
                'comment',
                'New Comment',
                'commented on your post',
                '/post/' || NEW.post_id,
                NEW.user_id,
                'post',
                NEW.post_id,
                NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-create Triggers (Just to be sure they use the new functions)

DROP TRIGGER IF EXISTS on_connection_request ON public.connections;
CREATE TRIGGER on_connection_request
    AFTER INSERT ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_connection_request();

DROP TRIGGER IF EXISTS on_connection_accepted ON public.connections;
CREATE TRIGGER on_connection_accepted
    AFTER UPDATE ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION handle_connection_accepted();

DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
CREATE TRIGGER on_post_like
    AFTER INSERT ON public.post_likes
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_like();

DROP TRIGGER IF EXISTS on_post_comment ON public.post_comments;
CREATE TRIGGER on_post_comment
    AFTER INSERT ON public.post_comments
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_comment();
