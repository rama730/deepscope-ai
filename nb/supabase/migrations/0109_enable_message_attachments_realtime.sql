-- Migration 0109: Enable Real-time for message_attachments
-- 1. Sets REPLICA IDENTITY FULL on message_attachments to allow frontend to handle DELETE events with full context.
-- 2. Adds message_attachments table to supabase_realtime publication for real-time subscriptions.

-- Enable Full Replica Identity for message_attachments (similar to message_reactions)
ALTER TABLE public.message_attachments REPLICA IDENTITY FULL;

-- Add message_attachments to realtime publication (if not already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;
  EXCEPTION
    WHEN OTHERS THEN 
      -- Table might already be in publication, ignore error
      NULL;
  END;
END $$;

NOTIFY pgrst, 'reload schema';
