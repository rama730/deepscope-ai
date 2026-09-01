-- Enable REPLICA IDENTITY FULL + realtime publication membership for app-wide realtime
-- Focus: notifications + messages (posts/likes/etc already handled by 0015_fix_realtime_replica.sql)

-- 1) Ensure DELETE payloads include old row fields
ALTER TABLE IF EXISTS public.notifications REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.messages REPLICA IDENTITY FULL;

-- Optional: conversation metadata changes can be useful (if you subscribe to conversations)
ALTER TABLE IF EXISTS public.conversations REPLICA IDENTITY FULL;

-- 2) Add tables to realtime publication (ignore duplicates)
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;


