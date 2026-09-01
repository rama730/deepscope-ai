-- Migration: Move post_comments to posts

-- 1. Migrate existing comments to posts table (Safe Check with Dynamic SQL)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'post_comments') THEN
        EXECUTE '
        INSERT INTO public.posts (
            id,
            user_id,
            content,
            parent_post_id,
            thread_root_id,
            is_reply,
            created_at,
            updated_at,
            likes_count,
            comments_count,
            reposts_count,
            views_count,
            bookmarks_count
        )
        SELECT
            pc.id,
            pc.user_id,
            pc.content,
            CASE
                WHEN pc.parent_comment_id IS NOT NULL THEN pc.parent_comment_id
                ELSE pc.post_id
            END as parent_post_id,
            pc.post_id as thread_root_id,
            true as is_reply,
            pc.created_at,
            pc.updated_at,
            0, 0, 0, 0, 0
        FROM public.post_comments pc';
    END IF;
END $$;

-- 2. Update parent_post_id for nested comments to point to the correct post UUID 
-- (Since we preserved IDs, the references should be valid in the posts table too, 
--  assuming all comments are migrated)

-- 3. Update Trigger for Posts to handle replies (With Security Fix)
CREATE OR REPLACE FUNCTION update_post_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'post_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'posts' THEN
        -- Handle replies count
        IF TG_OP = 'INSERT' AND NEW.is_reply = TRUE THEN
            -- 1. Update immediate parent's reply count
            IF NEW.parent_post_id IS NOT NULL THEN
                UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.parent_post_id;
            END IF;

            -- 2. Update thread root's total comment count (if distinct from parent)
            -- If parent IS root, we already updated it above. But wait, if comments_count on Root means "Total", and comments_count on Reply means "Replies to this", 
            -- then we are mixing semantics. 
            -- Usually top level post 'comments_count' is total. 
            -- Let's ensure top level gets +1. 
            -- If parent != thread_root, then thread_root needs +1.
            -- If parent == thread_root, it got +1 above.
            IF NEW.thread_root_id IS NOT NULL AND NEW.thread_root_id != NEW.parent_post_id THEN
                UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.thread_root_id;
            END IF;

            -- 3. Update Project Idea count if applicable
            -- We look up the idea linked to the thread root
            UPDATE public.project_ideas
            SET comments_count = comments_count + 1
            WHERE id = (
                SELECT project_idea_id 
                FROM public.posts 
                WHERE id = COALESCE(NEW.thread_root_id, NEW.parent_post_id)
            );

        ELSIF TG_OP = 'DELETE' AND OLD.is_reply = TRUE THEN
            -- 1. Decrement immediate parent
            IF OLD.parent_post_id IS NOT NULL THEN
                UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.parent_post_id;
            END IF;

            -- 2. Decrement thread root
            IF OLD.thread_root_id IS NOT NULL AND OLD.thread_root_id != OLD.parent_post_id THEN
                UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.thread_root_id;
            END IF;

            -- 3. Decrement Project Idea
            UPDATE public.project_ideas
            SET comments_count = GREATEST(0, comments_count - 1)
            WHERE id = (
                SELECT project_idea_id 
                FROM public.posts 
                WHERE id = COALESCE(OLD.thread_root_id, OLD.parent_post_id)
            );
        END IF;
    ELSIF TG_TABLE_NAME = 'post_reposts' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create triggers for existing tables
DROP TRIGGER IF EXISTS trigger_update_likes ON public.post_likes;
CREATE TRIGGER trigger_update_likes
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_counters();

-- Trigger for posts (replies)
DROP TRIGGER IF EXISTS trigger_update_post_replies ON public.posts;
CREATE TRIGGER trigger_update_post_replies
    AFTER INSERT OR DELETE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION update_post_counters();

-- Drop old triggers and table safely
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'post_comments') THEN
        DROP TRIGGER IF EXISTS trigger_update_comments ON public.post_comments;
        DROP TABLE public.post_comments;
    END IF;
END $$;
