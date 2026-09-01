-- Fix for username availability check
CREATE OR REPLACE FUNCTION public.check_username_availability(username_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_taken boolean;
  suggestion text;
BEGIN
  -- Check if username exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = username_input
  ) INTO is_taken;

  IF is_taken THEN
    -- Generate suggestion (simple append)
    suggestion := username_input || floor(random() * 1000)::text;
    RETURN jsonb_build_object('available', false, 'reason', 'taken', 'suggestion', suggestion);
  ELSE
    RETURN jsonb_build_object('available', true, 'reason', null, 'suggestion', null);
  END IF;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.check_username_availability(text) TO anon, authenticated;
