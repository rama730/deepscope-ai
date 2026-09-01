-- Migration 0030: Fix Engagement Notifications (Likes, Comments, Reposts)
-- This migration ensures that notifications are sent for all engagement actions.
-- It recreates the trigger functions with robust error handling and permissions.

-- 1. Handle New Like
CREATE OR REPLACE FUNCTION handle_new_like()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    BEGIN
        -- Get post owner
        SELECT user_id INTO post_owner_id
        FROM public.posts
        WHERE id = NEW.post_id;

        -- Don't notify if user likes their own post
        IF post_owner_id != NEW.user_id THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, link, actor_id, related_entity_type, related_entity_id, created_at
            ) VALUES (
                post_owner_id, 'like', 'New Like', 'liked your post', '/post/' || NEW.post_id, NEW.user_id, 'post', NEW.post_id, NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Like notification failed'; END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Handle New Comment
CREATE OR REPLACE FUNCTION handle_new_comment()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    BEGIN
        -- Get post owner
        SELECT user_id INTO post_owner_id
        FROM public.posts
        WHERE id = NEW.post_id;

        -- Don't notify if user comments on their own post
        IF post_owner_id != NEW.user_id THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, link, actor_id, related_entity_type, related_entity_id, created_at
            ) VALUES (
                post_owner_id, 'comment', 'New Comment', 'commented on your post', '/post/' || NEW.post_id, NEW.user_id, 'post', NEW.post_id, NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Comment notification failed'; END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Handle New Repost
CREATE OR REPLACE FUNCTION handle_new_repost()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    BEGIN
        -- Get post owner
        SELECT user_id INTO post_owner_id
        FROM public.posts
        WHERE id = NEW.post_id;

        -- Don't notify if user reposts their own post
        IF post_owner_id != NEW.user_id THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, link, actor_id, related_entity_type, related_entity_id, created_at
            ) VALUES (
                post_owner_id, 'repost', 'New Repost', 'reposted your post', '/post/' || NEW.post_id, NEW.user_id, 'post', NEW.post_id, NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Repost notification failed'; END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Triggers (Drop first to be safe)

DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
CREATE TRIGGER on_post_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION handle_new_like();

DROP TRIGGER IF EXISTS on_post_comment ON public.post_comments;
CREATE TRIGGER on_post_comment AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION handle_new_comment();

DROP TRIGGER IF EXISTS on_post_repost ON public.post_reposts;
CREATE TRIGGER on_post_repost AFTER INSERT ON public.post_reposts FOR EACH ROW EXECUTE FUNCTION handle_new_repost();

-- 5. Grant Permissions (Just in case)
GRANT ALL ON TABLE public.notifications TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.post_likes TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.post_comments TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.post_reposts TO postgres, service_role, authenticated, anon;
