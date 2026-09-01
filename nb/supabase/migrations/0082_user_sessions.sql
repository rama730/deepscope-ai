-- Migration: User Sessions
-- Purpose: Track active sessions with device/IP info

CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT, -- Optional: store refresh token hash or session ID if available
    device_info JSONB, -- { browser, os, device_type }
    ip_address TEXT,
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users delete own sessions" ON public.user_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Only service role strictly manages inserts/updates usually, 
-- but we allowed the backend to do it. The backend uses Service Role for `admin` ops 
-- or we can allow the user to insert if we trust the logic.
-- Ideally, standard RLS:
CREATE POLICY "Users manage own sessions" ON public.user_sessions
    FOR ALL USING (auth.uid() = user_id);
