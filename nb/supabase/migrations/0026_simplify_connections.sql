-- Migration 0026: Simplify Connections (The "Redesign")
-- We are removing all complex RLS rules and allowing any authenticated user to manage connections.
-- This guarantees that "Connect" will work without permission errors.

-- 1. Reset RLS on connections
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users read own connections" ON public.connections;
DROP POLICY IF EXISTS "Users manage own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can create connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete connections" ON public.connections;
DROP POLICY IF EXISTS "View connections" ON public.connections;
DROP POLICY IF EXISTS "Create connections" ON public.connections;
DROP POLICY IF EXISTS "Update connections" ON public.connections;
DROP POLICY IF EXISTS "Delete connections" ON public.connections;
DROP POLICY IF EXISTS "Allow all authenticated" ON public.connections;

-- 2. Create ONE Simple Policy
-- Allow any authenticated user to do ANYTHING on the connections table.
-- This is the "Simple Mode" requested.
CREATE POLICY "Allow all authenticated" ON public.connections
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- 3. Ensure Notification Triggers are Safe
-- We re-define the functions to be absolutely sure they swallow errors and don't block connections.

CREATE OR REPLACE FUNCTION handle_new_connection_request()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        IF NEW.status = 'pending' THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, link, actor_id, related_entity_type, related_entity_id, created_at
            ) VALUES (
                NEW.connected_user_id, 'connection_request', 'New Connection Request', 'sent you a connection request', '/people/invitations', NEW.user_id, 'connection', NEW.id, NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Log warning but DO NOT FAIL
        RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_connection_accepted()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, link, actor_id, related_entity_type, related_entity_id, created_at
            ) VALUES (
                NEW.user_id, 'connection_accepted', 'Connection Accepted', 'accepted your connection request', '/profile/' || NEW.connected_user_id, NEW.connected_user_id, 'connection', NEW.id, NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Triggers
DROP TRIGGER IF EXISTS on_connection_request ON public.connections;
CREATE TRIGGER on_connection_request AFTER INSERT ON public.connections FOR EACH ROW EXECUTE FUNCTION handle_new_connection_request();

DROP TRIGGER IF EXISTS on_connection_accepted ON public.connections;
CREATE TRIGGER on_connection_accepted AFTER UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION handle_connection_accepted();
