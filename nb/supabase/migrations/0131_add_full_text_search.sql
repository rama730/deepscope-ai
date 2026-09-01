-- Enable pg_trgm for trigram matching (fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add generated search column to profiles
-- We combine full_name, username, bio, and location into a single searchable vector
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', 
    coalesce(full_name, '') || ' ' || 
    coalesce(username, '') || ' ' || 
    coalesce(bio, '') || ' ' || 
    coalesce(location, '')
  )
) STORED;

-- Create GIN index for fast search
CREATE INDEX IF NOT EXISTS profiles_search_idx ON public.profiles USING GIN (search_vector);
