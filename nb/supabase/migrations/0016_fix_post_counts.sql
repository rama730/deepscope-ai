-- Fix incorrect post counts by recalculating from actual data
-- This will correct any phantom likes/comments/reposts/bookmarks

-- Recalculate likes_count
UPDATE public.posts p
SET likes_count = (
    SELECT COUNT(*)
    FROM public.post_likes pl
    WHERE pl.post_id = p.id
);

-- Recalculate comments_count
UPDATE public.posts p
SET comments_count = (
    SELECT COUNT(*)
    FROM public.post_comments pc
    WHERE pc.post_id = p.id
);

-- Recalculate reposts_count
UPDATE public.posts p
SET reposts_count = (
    SELECT COUNT(*)
    FROM public.post_reposts pr
    WHERE pr.post_id = p.id
);

-- Recalculate bookmarks_count
UPDATE public.posts p
SET bookmarks_count = (
    SELECT COUNT(*)
    FROM public.bookmarks b
    WHERE b.entity_id = p.id AND b.entity_type = 'post'
);

-- Reset views_count to 0 (views are ephemeral, recounted on each session)
UPDATE public.posts SET views_count = 0;
