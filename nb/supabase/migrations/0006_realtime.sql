-- ==============================================================================
-- MIGRATION 0006: REALTIME SETUP
-- ==============================================================================

-- 1. ENABLE REALTIME FOR TABLES
-- Explicitly add tables to the publication for real-time subscriptions

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts; -- For live feed updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes; -- For live like counts
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments; -- For live comments

