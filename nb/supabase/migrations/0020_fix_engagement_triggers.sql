-- Fix engagement triggers to bypass RLS using SECURITY DEFINER
-- This ensures that when User A likes User B's post, the count on User B's post can be updated.

-- 1. Update Post Counters Function
CREATE OR REPLACE FUNCTION update_post_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'post_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'post_comments' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
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
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Added SECURITY DEFINER

-- 2. Update Bookmark Counters Function
CREATE OR REPLACE FUNCTION update_bookmark_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.entity_type = 'post' THEN
        UPDATE public.posts SET bookmarks_count = bookmarks_count + 1 WHERE id = NEW.entity_id;
    ELSIF TG_OP = 'DELETE' AND OLD.entity_type = 'post' THEN
        UPDATE public.posts SET bookmarks_count = GREATEST(0, bookmarks_count - 1) WHERE id = OLD.entity_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Added SECURITY DEFINER

-- 3. Grant execute permissions (just in case)
GRANT EXECUTE ON FUNCTION update_post_counters() TO authenticated;
GRANT EXECUTE ON FUNCTION update_bookmark_counts() TO authenticated;
