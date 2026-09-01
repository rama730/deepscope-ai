-- Migration 0032: Final Notification Fix
-- 1. Disable RLS on notifications to ensure Realtime works 100%
-- 2. Safely enable Realtime (ignore if already enabled)
-- 3. Grant all permissions

-- 1. Disable RLS
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 2. Safely Enable Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Already exists, do nothing
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Already exists, do nothing
    END;
END $$;

-- 3. Grant Permissions
GRANT ALL ON TABLE public.notifications TO postgres, service_role, authenticated, anon;
