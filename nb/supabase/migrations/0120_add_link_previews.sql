-- Migration 0120: Add Link Previews Table
-- Stores cached link preview metadata for faster loading

CREATE TABLE IF NOT EXISTS public.link_previews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    description TEXT,
    image TEXT,
    site_name TEXT,
    favicon TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_link_previews_url ON public.link_previews(url);

-- Enable RLS
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view link previews"
    ON public.link_previews
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert link previews"
    ON public.link_previews
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update link previews"
    ON public.link_previews
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON TABLE public.link_previews TO authenticated;
GRANT SELECT ON TABLE public.link_previews TO anon;

-- Add comment
COMMENT ON TABLE public.link_previews IS 'Cached link preview metadata for URLs shared in messages';
