-- Migration: Fix post counters trigger security
-- Description: Sets the update_post_counters function to SECURITY DEFINER.
-- This is necessary because RLS policies on the 'posts' table only allow users to update their OWN posts.
-- However, when a user replies to someone else's post, the trigger needs to update the 'comments_count' on the PARENT post (owned by another user).
-- By using SECURITY DEFINER, the function runs with the privileges of the creator (postgres/admin), bypassing RLS for the counter updates.

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
            IF NEW.thread_root_id IS NOT NULL AND NEW.thread_root_id != NEW.parent_post_id THEN
                UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.thread_root_id;
            END IF;

            -- 3. Update Project Idea count if applicable
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
