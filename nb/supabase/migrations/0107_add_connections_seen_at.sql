-- ==============================================================================
-- MIGRATION 0107: ADD SEEN TRACKING TO CONNECTION REQUESTS
-- ==============================================================================

ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;


