-- ==============================================================================
-- HOTFIX: RESOLVE PERMISSION DENIED (42501) AND RLS ISSUES
-- ==============================================================================

-- 1. ENSURE EXPLICIT GRANTS
-- Sometimes PostgREST roles need explicit grants for newly created tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_chat_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_chat_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_chat_read_status TO authenticated;

GRANT SELECT ON public.project_chat_messages TO anon;
GRANT SELECT ON public.project_chat_attachments TO anon;
GRANT SELECT ON public.project_chat_reactions TO anon;

-- 2. RE-DEFINITION OF RLS POLICIES (SIMPLIFIED & ROBUST)

-- PROJECT CHAT MESSAGES
DROP POLICY IF EXISTS "Chat visible to members" ON public.project_chat_messages;
CREATE POLICY "Project members can view messages" ON public.project_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
            WHERE p.id = project_chat_messages.project_id
            AND (p.creator_id = auth.uid() OR pc.user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Members can send messages" ON public.project_chat_messages;
CREATE POLICY "Project members can send messages" ON public.project_chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            LEFT JOIN public.project_collaborators pc ON p.id = pc.project_id
            WHERE p.id = project_chat_messages.project_id
            AND (p.creator_id = auth.uid() OR pc.user_id = auth.uid())
        )
        AND auth.uid() = sender_id
    );

-- PROJECT CHAT ATTACHMENTS
DROP POLICY IF EXISTS "Project members can view chat attachments" ON public.project_chat_attachments;
CREATE POLICY "Project members can view chat attachments" ON public.project_chat_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_chat_messages m
            WHERE m.id = project_chat_attachments.message_id
            -- The message itself is protected by its own RLS
        )
    );

DROP POLICY IF EXISTS "Users can upload their own attachments" ON public.project_chat_attachments;
CREATE POLICY "Users can upload their own attachments" ON public.project_chat_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_chat_messages m
            WHERE m.id = project_chat_attachments.message_id
            AND m.sender_id = auth.uid()
        )
    );

-- PROJECT CHAT REACTIONS
DROP POLICY IF EXISTS "Project members can view reactions" ON public.project_chat_reactions;
CREATE POLICY "Project members can view reactions" ON public.project_chat_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_chat_messages m
            WHERE m.id = project_chat_reactions.message_id
        )
    );

DROP POLICY IF EXISTS "Users can react" ON public.project_chat_reactions;
CREATE POLICY "Users can react" ON public.project_chat_reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. ENSURE IDEMPOTENT REALTIME PUBLICATION
-- Sometimes tables fail to join the publication if permissions are tight
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_chat_messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_chat_attachments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_attachments;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_chat_reactions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_reactions;
    END IF;
END $$;
