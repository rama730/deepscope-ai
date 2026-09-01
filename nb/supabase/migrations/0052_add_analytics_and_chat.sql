-- Migration 0052: Add Analytics and Chat
-- Enables Realtime for project chat and hardens RLS policies.

-- 1. Enable Realtime for project_chat_messages
-- 1. Enable Realtime for project_chat_messages
DO $$
BEGIN
  -- Add table to publication if not already present
  -- We try to add it, and if it fails (already added), we ignore the error
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_messages;
  EXCEPTION
    WHEN OTHERS THEN NULL; -- "relation is already member of publication" or similar
  END;
END $$;

-- 2. HARDEN RLS FOR project_chat_messages
ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.project_chat_messages TO authenticated;
GRANT ALL ON TABLE public.project_chat_messages TO service_role;

-- Drop existings
DROP POLICY IF EXISTS "Chat visible to members" ON public.project_chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.project_chat_messages;
DROP POLICY IF EXISTS "Chat Select Policy" ON public.project_chat_messages;
DROP POLICY IF EXISTS "Chat Insert Policy" ON public.project_chat_messages;

-- Create Policies
CREATE POLICY "Chat Select Policy" ON public.project_chat_messages
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_chat_messages.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_chat_messages.project_id AND pc.user_id = auth.uid())
);

CREATE POLICY "Chat Insert Policy" ON public.project_chat_messages
FOR INSERT WITH CHECK (
    -- Must be authenticated
    auth.role() = 'authenticated' AND
    -- Must be a member
    (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_chat_messages.project_id AND p.creator_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_chat_messages.project_id AND pc.user_id = auth.uid())
    )
    AND sender_id = auth.uid()
);

-- 3. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
