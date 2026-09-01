-- Migration 0033: Fix Messaging Permissions
-- Explicitly grant permissions to ensure messaging works for authenticated users.

-- 1. Grant permissions on tables
GRANT ALL ON TABLE public.conversations TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.conversation_participants TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.messages TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.message_reactions TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.typing_indicators TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.conversation_metadata TO postgres, service_role, authenticated, anon;

-- 2. Grant execute on RPC functions (just in case)
GRANT EXECUTE ON FUNCTION public.get_conversations_with_metadata(UUID) TO postgres, service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_messages_with_details(UUID, INTEGER) TO postgres, service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID, UUID) TO postgres, service_role, authenticated, anon;

-- 3. Ensure Realtime is enabled for messages (idempotent)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
