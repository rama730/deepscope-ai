-- Migration 0066: Add Delete Account RPC
-- Function to allow users to fully delete their own account.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the user from auth.users
  -- This will trigger CASCADE deletes for all related data in public tables
  -- (profiles, posts, etc.) assuming FKs are set to ON DELETE CASCADE.
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
