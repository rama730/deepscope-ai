-- Migration 0029: Fix Table Permissions (Grants)
-- Disabling RLS is not enough if the roles don't have basic permissions (GRANTs).
-- This script ensures that authenticated users and the service role can actually modify the table.

-- 1. Grant Permissions on Table
GRANT ALL ON TABLE public.connections TO postgres;
GRANT ALL ON TABLE public.connections TO service_role;
GRANT ALL ON TABLE public.connections TO authenticated;
GRANT ALL ON TABLE public.connections TO anon;

-- 2. Grant Permissions on Notifications (just in case)
GRANT ALL ON TABLE public.notifications TO postgres;
GRANT ALL ON TABLE public.notifications TO service_role;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO anon;

-- 3. Ensure RLS is disabled (redundant but safe)
ALTER TABLE public.connections DISABLE ROW LEVEL SECURITY;
