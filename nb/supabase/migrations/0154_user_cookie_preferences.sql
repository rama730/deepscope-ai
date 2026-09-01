-- Migration 0154: Create User Cookie Preferences
-- Stores user-specific cookie consent settings.

CREATE TABLE IF NOT EXISTS public.user_cookie_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    essential_cookies BOOLEAN DEFAULT true,
    functional_cookies BOOLEAN DEFAULT false,
    analytics_cookies BOOLEAN DEFAULT false,
    marketing_cookies BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_cookie_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own cookie preferences"
    ON public.user_cookie_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own cookie preferences"
    ON public.user_cookie_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON TABLE public.user_cookie_preferences TO postgres, service_role;
GRANT ALL ON TABLE public.user_cookie_preferences TO authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.user_cookie_preferences;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.user_cookie_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
