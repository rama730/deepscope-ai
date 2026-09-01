-- Clean up ALL interaction data and start fresh
-- This will remove all likes, reposts, comments, and bookmarks
-- Then reset all counters to 0

-- Delete all interactions
DELETE FROM public.post_likes;
DELETE FROM public.post_reposts;
DELETE FROM public.post_comments;
DELETE FROM public.bookmarks WHERE entity_type = 'post';

-- Reset all counters to 0
UPDATE public.posts SET 
    likes_count = 0,
    comments_count = 0,
    reposts_count = 0,
    bookmarks_count = 0,
    views_count = 0;

-- Verify everything is clean
SELECT 'post_likes' as table_name, COUNT(*) as count FROM public.post_likes
UNION ALL
SELECT 'post_reposts', COUNT(*) FROM public.post_reposts
UNION ALL
SELECT 'post_comments', COUNT(*) FROM public.post_comments
UNION ALL
SELECT 'bookmarks', COUNT(*) FROM public.bookmarks WHERE entity_type = 'post';
