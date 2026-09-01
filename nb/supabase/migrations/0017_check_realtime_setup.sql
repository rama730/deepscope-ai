-- Diagnostic: Check if tables are configured for realtime
-- Run this in Supabase SQL Editor to see what's missing

-- 1. Check REPLICA IDENTITY settings
SELECT 
    tablename,
    CASE 
        WHEN relreplident = 'd' THEN 'DEFAULT'
        WHEN relreplident = 'n' THEN 'NOTHING'
        WHEN relreplident = 'f' THEN 'FULL'
        WHEN relreplident = 'i' THEN 'INDEX'
    END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
WHERE n.nspname = 'public' 
AND c.relname IN ('post_likes', 'post_comments', 'post_reposts', 'posts', 'bookmarks')
ORDER BY c.relname;

-- 2. Check which tables are in supabase_realtime publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename IN ('post_likes', 'post_comments', 'post_reposts', 'posts', 'bookmarks')
ORDER BY tablename;

-- If any tables are missing from the results above, run the commands below:

-- Enable REPLICA IDENTITY FULL (if not already set)
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.post_reposts REPLICA IDENTITY FULL;
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.bookmarks REPLICA IDENTITY FULL;

-- Add tables to realtime publication (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reposts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;
