-- Migration 0015: Emergency Fix - Drop Broken Login Trigger
-- The trigger 'on_auth_session_created' depends on tables 'security_preferences' and 'notifications'
-- which do not exist. This causes "Database error granting user" during login.
-- This migration removes the trigger to restore login functionality.

DROP TRIGGER IF EXISTS on_auth_session_created ON auth.sessions;
DROP FUNCTION IF EXISTS public.handle_new_session();
