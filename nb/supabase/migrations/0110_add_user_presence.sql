-- Add User Presence Tracking
-- Requires: 0001_auth_profile.sql

-- Add last_active_at column to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at 
ON public.profiles(last_active_at) WHERE last_active_at IS NOT NULL;

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = NOW()
  WHERE id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_presence() TO authenticated;

-- Enable realtime for profiles.last_active_at updates (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END
$$;
