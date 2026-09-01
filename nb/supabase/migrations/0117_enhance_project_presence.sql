-- Migration 0117: Enhance Project Presence
-- Adds typing indicators and detailed activity tracking for project presence

-- 1. Add columns to project_presence table if they don't exist
ALTER TABLE public.project_presence
    ADD COLUMN IF NOT EXISTS is_typing BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'active'; -- active, typing, idle, away

-- 2. Create index for efficient presence queries
CREATE INDEX IF NOT EXISTS idx_project_presence_project_activity 
    ON public.project_presence(project_id, last_activity_at DESC) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_project_presence_typing 
    ON public.project_presence(project_id, is_typing) 
    WHERE is_typing = TRUE;

-- 3. Create function to update presence on activity
CREATE OR REPLACE FUNCTION public.update_project_presence(
    p_project_id UUID,
    p_user_id UUID,
    p_is_typing BOOLEAN DEFAULT FALSE,
    p_activity_type TEXT DEFAULT 'active'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.project_presence (
        project_id,
        user_id,
        last_seen_at,
        last_activity_at,
        is_active,
        is_typing,
        activity_type
    )
    VALUES (
        p_project_id,
        p_user_id,
        NOW(),
        NOW(),
        TRUE,
        p_is_typing,
        p_activity_type
    )
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET
        last_seen_at = NOW(),
        last_activity_at = NOW(),
        is_active = TRUE,
        is_typing = p_is_typing,
        activity_type = p_activity_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_project_presence(UUID, UUID, BOOLEAN, TEXT) TO authenticated;

-- 4. Create function to mark user as idle/away after inactivity
CREATE OR REPLACE FUNCTION public.mark_project_presence_idle()
RETURNS VOID AS $$
BEGIN
    -- Mark users as idle if they haven't been active in 5 minutes
    UPDATE public.project_presence
    SET 
        is_typing = FALSE,
        activity_type = CASE 
            WHEN last_activity_at < NOW() - INTERVAL '15 minutes' THEN 'away'
            WHEN last_activity_at < NOW() - INTERVAL '5 minutes' THEN 'idle'
            ELSE activity_type
        END
    WHERE is_active = TRUE
    AND last_activity_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- 5. Ensure real-time is enabled for project_presence
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'project_presence'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.project_presence;
    END IF;
END
$$;

-- 6. Set REPLICA IDENTITY FULL for DELETE events
ALTER TABLE public.project_presence REPLICA IDENTITY FULL;
