-- Migration 0107: Ensure Engagement Tables are Enabled for Real-time
-- This ensures all engagement-related tables are properly set up for real-time subscriptions

-- 1. Set REPLICA IDENTITY FULL for all engagement tables
-- This ensures DELETE events contain full old record data
ALTER TABLE IF EXISTS public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.post_reposts REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.posts REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.notifications REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.bookmarks REPLICA IDENTITY FULL;

-- 2. Add tables to supabase_realtime publication (safely ignore if already added)
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes; 
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reposts; 
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.posts; 
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; 
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
    
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks; 
    EXCEPTION WHEN duplicate_object THEN NULL; 
    END;
END $$;

-- 3. Grant necessary permissions for real-time
GRANT SELECT ON public.post_likes TO authenticated, anon;
GRANT SELECT ON public.post_reposts TO authenticated, anon;
GRANT SELECT ON public.posts TO authenticated, anon;
GRANT SELECT ON public.notifications TO authenticated, anon;
GRANT SELECT ON public.bookmarks TO authenticated, anon;
