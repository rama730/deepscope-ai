-- Migration: Batch View Counts
-- Purpose: Allow batch incrementing of post view counts to reduce RPC overhead.

CREATE OR REPLACE FUNCTION public.batch_increment_view_counts(
    p_post_ids UUID[]
)
RETURNS void AS $$
BEGIN
    -- Update views_count for all posts in the array
    -- We use unnest to treat the array as a table, then join or update based on IN
    UPDATE public.posts
    SET views_count = views_count + 1
    WHERE id = ANY(p_post_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.batch_increment_view_counts TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_increment_view_counts TO anon;
