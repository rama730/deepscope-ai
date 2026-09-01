-- Migration 0025: Fix Connections RLS and Restore Notifications
-- The user reported "permission denied" on connections table.
-- We will reset RLS policies for connections to be simple and permissive for the involved users.
-- We will also restore the notification triggers (using the safe functions from 0023).

-- 1. Reset RLS on connections
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own connections" ON public.connections;
DROP POLICY IF EXISTS "Users manage own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can create connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete connections" ON public.connections;

-- Drop new policies if they exist (to fix "policy already exists" error)
DROP POLICY IF EXISTS "View connections" ON public.connections;
DROP POLICY IF EXISTS "Create connections" ON public.connections;
DROP POLICY IF EXISTS "Update connections" ON public.connections;
DROP POLICY IF EXISTS "Delete connections" ON public.connections;

-- Simple Policies
-- Allow users to see connections they are part of
CREATE POLICY "View connections" ON public.connections
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- Allow users to send requests (insert where they are the sender)
CREATE POLICY "Create connections" ON public.connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update connections they are part of (accept/reject)
CREATE POLICY "Update connections" ON public.connections
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- Allow users to delete connections they are part of (cancel/unfriend)
CREATE POLICY "Delete connections" ON public.connections
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = connected_user_id);


-- 2. Restore Notification Triggers (Safe)
-- We assume the functions handle_new_connection_request, handle_connection_accepted, etc. 
-- were created in 0023 (or 0022). We will re-create them here just to be absolutely sure they exist and are safe.

-- Function to handle new connection requests (SAFE)
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
        RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle accepted connections (SAFE)
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

-- Re-create Triggers
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

-- We also restore like/comment triggers if they were dropped
CREATE OR REPLACE FUNCTION handle_new_like()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    BEGIN
        SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
        IF post_owner_id != NEW.user_id THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, link, actor_id, related_entity_type, related_entity_id, created_at
            ) VALUES (
                post_owner_id, 'like', 'New Like', 'liked your post', '/post/' || NEW.post_id, NEW.user_id, 'post', NEW.post_id, NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Notification trigger failed'; END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_comment()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    BEGIN
        SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
        IF post_owner_id != NEW.user_id THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, link, actor_id, related_entity_type, related_entity_id, created_at
            ) VALUES (
                post_owner_id, 'comment', 'New Comment', 'commented on your post', '/post/' || NEW.post_id, NEW.user_id, 'post', NEW.post_id, NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Notification trigger failed'; END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
CREATE TRIGGER on_post_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION handle_new_like();

DROP TRIGGER IF EXISTS on_post_comment ON public.post_comments;
CREATE TRIGGER on_post_comment AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION handle_new_comment();
