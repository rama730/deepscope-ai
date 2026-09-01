-- Migration: Rate Limiting System
-- Purpose: Create infrastructure for API rate limiting to prevent abuse.
-- ID: 0088

-- 1. Create table to track rate limit attempts
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL, -- user_id, ip_address, email, etc.
    identifier_type TEXT NOT NULL, -- 'user_id', 'ip', 'email'
    action_type TEXT NOT NULL, -- 'login', 'send_message', 'create_project'
    attempts INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Compound unique key ensures one record per user+action
    UNIQUE(identifier, identifier_type, action_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(identifier, identifier_type, action_type);

-- 2. RLS Policies
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system/service role can access this table directly
-- We do NOT want users to be able to read/write their own rate limits directly via client API
CREATE POLICY "System only access" ON public.rate_limits 
    FOR ALL USING (false); -- Deny all direct access, RPC only with SECURITY DEFINER

-- 3. The RPC Function (Heart of the logic)
-- This function atomcially increments counters and checks limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_action_type TEXT,
    p_max_attempts INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 15,
    p_lockout_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (service role), bypassing RLS
AS $$
DECLARE
    v_record public.rate_limits%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_window_start TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    -- Check if record exists
    SELECT * INTO v_record 
    FROM public.rate_limits 
    WHERE identifier = p_identifier 
      AND identifier_type = p_identifier_type 
      AND action_type = p_action_type;

    IF v_record IS NULL THEN
        -- First attempt
        INSERT INTO public.rate_limits (identifier, identifier_type, action_type, attempts, last_attempt_at)
        VALUES (p_identifier, p_identifier_type, p_action_type, 1, v_now)
        RETURNING * INTO v_record;
        
        RETURN jsonb_build_object(
            'allowed', true,
            'attempts_remaining', p_max_attempts - 1,
            'locked_until', null
        );
    END IF;

    -- Check if currently locked out
    IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'attempts_remaining', 0,
            'locked_until', v_record.locked_until
        );
    END IF;

    -- Check if window has expired (reset counter)
    v_window_start := v_record.last_attempt_at - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Ideally we want a sliding window or fixed window logic. 
    -- Simple logic: If last attempt was outside window, reset.
    -- Better logic (implemented here): If last attempt was > window ago, reset.
    -- Note: This is a "leaky bucket" approximation.
    IF v_record.last_attempt_at < (v_now - (p_window_minutes || ' minutes')::INTERVAL) THEN
        UPDATE public.rate_limits
        SET attempts = 1, last_attempt_at = v_now, locked_until = NULL
        WHERE id = v_record.id;
        
        RETURN jsonb_build_object(
            'allowed', true,
            'attempts_remaining', p_max_attempts - 1,
            'locked_until', null
        );
    ELSE
        -- Within window, increment
        IF v_record.attempts >= p_max_attempts THEN
            -- Lock out
            UPDATE public.rate_limits
            SET locked_until = v_now + (p_lockout_minutes || ' minutes')::INTERVAL,
                last_attempt_at = v_now
            WHERE id = v_record.id
            RETURNING locked_until INTO v_record.locked_until;
            
            RETURN jsonb_build_object(
                'allowed', false,
                'attempts_remaining', 0,
                'locked_until', v_record.locked_until
            );
        ELSE
            -- Increment
            UPDATE public.rate_limits
            SET attempts = attempts + 1,
                last_attempt_at = v_now
            WHERE id = v_record.id;
            
            RETURN jsonb_build_object(
                'allowed', true,
                'attempts_remaining', p_max_attempts - (v_record.attempts + 1),
                'locked_until', null
            );
        END IF;
    END IF;
END;
$$;
