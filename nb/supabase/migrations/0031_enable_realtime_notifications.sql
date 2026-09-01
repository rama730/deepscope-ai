-- Migration 0031: Enable Realtime for Notifications
-- This is required for the client to receive updates when a new notification is inserted.

BEGIN;
  -- Check if the publication exists (it should in Supabase)
  -- Add the notifications table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  
  -- Also ensure connections is added for the pending requests real-time
  ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
COMMIT;
