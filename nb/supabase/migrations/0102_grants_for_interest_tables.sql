-- ==============================================================================
-- MIGRATION 0102: GRANTS FOR INTEREST TABLES
-- Fixes "permission denied for table skills" by granting table privileges to authenticated.
-- ==============================================================================

-- Ensure roles can use the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Skills (created in 0001_auth_profile.sql)
GRANT SELECT ON TABLE public.skills TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.skills TO authenticated;

-- New interest graph tables (created in 0098_interest_graph_tools_and_techniques.sql)
GRANT SELECT ON TABLE public.user_tools TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.user_tools TO authenticated;

GRANT SELECT ON TABLE public.user_techniques TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.user_techniques TO authenticated;

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';


