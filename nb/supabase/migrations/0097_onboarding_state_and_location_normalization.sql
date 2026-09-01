-- ==============================================================================
-- MIGRATION 0097: ONBOARDING STATE + LOCATION NORMALIZATION
-- Adds onboarding step tracking + normalized location fields for better matching
-- ==============================================================================

-- 1) Onboarding state fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'profile'::text,
  ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Constrain onboarding_step to known values (non-breaking: only applies if constraint doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_onboarding_step_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_onboarding_step_check
      CHECK (onboarding_step IN ('profile', 'interests', 'recommendations', 'review', 'settings', 'completed'));
  END IF;
END $$;

-- 2) Normalized location fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_region TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT,
  ADD COLUMN IF NOT EXISTS location_source TEXT; -- 'ip_geo' | 'user'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_location_source_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_location_source_check
      CHECK (location_source IS NULL OR location_source IN ('ip_geo', 'user'));
  END IF;
END $$;

-- 3) Helpful indexes for recommendation queries
CREATE INDEX IF NOT EXISTS idx_profiles_location_city ON public.profiles (LOWER(location_city));
CREATE INDEX IF NOT EXISTS idx_profiles_location_region ON public.profiles (LOWER(location_region));
CREATE INDEX IF NOT EXISTS idx_profiles_location_country ON public.profiles (LOWER(location_country));


