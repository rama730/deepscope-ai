-- RPC: Update Latest Session Activity
-- Purpose: Efficiently update the last_active timestamp

CREATE OR REPLACE FUNCTION public.update_latest_session_activity(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_sessions
    SET last_active = NOW()
    WHERE id = (
        SELECT id FROM public.user_sessions 
        WHERE user_id = user_uuid 
        ORDER BY last_active DESC 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
