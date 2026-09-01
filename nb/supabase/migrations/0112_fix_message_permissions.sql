-- Migration 0112: Fix Message Permissions
-- This migration ensures GRANT permissions are set for message_attachments and message_reactions
-- Run this if you're getting "permission denied" errors for attachments or reactions

-- Grant permissions for message_attachments (required even with RLS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_attachments') THEN
    GRANT ALL ON TABLE public.message_attachments TO authenticated;
    RAISE NOTICE 'Granted permissions on message_attachments';
  ELSE
    RAISE NOTICE 'message_attachments table does not exist yet';
  END IF;
END $$;

-- Grant permissions for message_reactions (required even with RLS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_reactions') THEN
    GRANT ALL ON TABLE public.message_reactions TO authenticated;
    RAISE NOTICE 'Granted permissions on message_reactions';
  ELSE
    RAISE NOTICE 'message_reactions table does not exist yet';
  END IF;
END $$;
