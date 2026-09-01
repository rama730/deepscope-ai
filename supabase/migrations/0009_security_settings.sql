-- Migration 0009: Security Settings
-- Implements login history tracking and session management

-- 1. Create login_history table
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    location TEXT, -- Placeholder for future geo-lookup
    device_info TEXT, -- Placeholder for parsed UA if needed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own login history
DROP POLICY IF EXISTS "Users can view their own login history" ON public.login_history;

CREATE POLICY "Users can view their own login history"
    ON public.login_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT SELECT ON public.login_history TO authenticated;
GRANT SELECT ON public.login_history TO service_role;

-- 2. Secure RPC to get active sessions
-- This function accesses auth.sessions which is otherwise not accessible
CREATE OR REPLACE FUNCTION public.get_my_sessions()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    ip INET,
    user_agent TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.created_at,
        s.updated_at as last_seen,
        s.ip,
        s.user_agent
    FROM
        auth.sessions s
    WHERE
        s.user_id = auth.uid()
    ORDER BY
        s.updated_at DESC;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_sessions() TO authenticated;

-- 3. Secure RPC to revoke a session
CREATE OR REPLACE FUNCTION public.revoke_my_session(session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    deleted_row_count INT;
BEGIN
    -- Prevent users from deleting sessions that don't belong to them
    DELETE FROM auth.sessions
    WHERE id = session_id AND user_id = auth.uid();

    GET DIAGNOSTICS deleted_row_count = ROW_COUNT;
    
    RETURN deleted_row_count > 0;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.revoke_my_session(uuid) TO authenticated;

-- 4. Trigger to track new sessions (Login History)
CREATE OR REPLACE FUNCTION public.handle_new_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.login_history (user_id, ip_address, user_agent)
    VALUES (NEW.user_id, NEW.ip, NEW.user_agent);
    RETURN NEW;
END;
$$;

-- Drop trigger if it exists to allow idempotency
DROP TRIGGER IF EXISTS on_auth_session_created ON auth.sessions;

-- Create trigger on auth.sessions
CREATE TRIGGER on_auth_session_created
    AFTER INSERT ON auth.sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_session();
