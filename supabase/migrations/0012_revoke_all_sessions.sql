-- Migration 0012: Revoke All Sessions
-- Adds RPC to revoke all sessions for the current user

CREATE OR REPLACE FUNCTION public.revoke_all_my_sessions()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    deleted_row_count INT;
BEGIN
    DELETE FROM auth.sessions
    WHERE user_id = auth.uid();

    GET DIAGNOSTICS deleted_row_count = ROW_COUNT;

    RETURN deleted_row_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_all_my_sessions() TO authenticated;
