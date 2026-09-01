-- Migration 0038: Create User Preferences
-- Stores user-specific settings for the Hub and other areas.

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    hub_view_mode TEXT DEFAULT 'grid',
    hub_sort_by TEXT DEFAULT 'newest',
    hub_filters JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own preferences"
    ON public.user_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON TABLE public.user_preferences TO postgres, service_role;
GRANT ALL ON TABLE public.user_preferences TO authenticated;
