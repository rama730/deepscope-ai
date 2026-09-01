-- Migration 0014: Create Passkey Credentials Table
-- Fixes "Table Count=null" error by ensuring the table exists

CREATE TABLE IF NOT EXISTS public.passkey_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    transports JSONB,
    device_type TEXT,
    backed_up BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own passkeys
CREATE POLICY "Users can view their own passkeys"
    ON public.passkey_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own passkeys
CREATE POLICY "Users can register their own passkeys"
    ON public.passkey_credentials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own passkeys (e.g. counter)
CREATE POLICY "Users can update their own passkeys"
    ON public.passkey_credentials
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own passkeys
CREATE POLICY "Users can delete their own passkeys"
    ON public.passkey_credentials
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passkey_credentials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passkey_credentials TO service_role;
