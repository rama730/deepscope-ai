-- ==============================================================================
-- MIGRATION: FIX DM PERMISSIONS FOR REALTIME
-- Purpose: Grant explicit permissions to 'authenticated' role for DM tables so
-- that Realtime subscriptions work for receivers.
-- ==============================================================================

-- 1. Grant Permissions to Authenticated Users
-- PostgREST/Realtime requires explicit SELECT permissions for the role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_indicators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_metadata TO authenticated;

-- 2. Grant Permissions to Anon (Optional, but good for public read if ever needed, keeping safe default)
-- For now, keep DMs private to authenticated, so skipping anon grants for strict security unless needed.

-- 3. Ensure Realtime Publication
-- Safely add tables to publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'typing_indicators') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
  END IF;
END
$$;
