-- ==============================================================================
-- MIGRATION 0101: EXPAND LOCATION SOURCE VALUES
-- Adds 'device_geo' as an allowed source for profiles.location_source.
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_location_source_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_location_source_check;
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_location_source_check
  CHECK (location_source IS NULL OR location_source IN ('ip_geo', 'user', 'device_geo'));


