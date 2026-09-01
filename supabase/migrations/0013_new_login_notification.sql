-- Migration 0013: New Login Notifications
-- Updates handle_new_session to create in-app notifications if enabled in preferences

CREATE OR REPLACE FUNCTION public.handle_new_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prefs RECORD;
BEGIN
    -- 1. Insert into Login History (existing logic)
    INSERT INTO public.login_history (user_id, ip_address, user_agent)
    VALUES (NEW.user_id, NEW.ip, NEW.user_agent);

    -- 2. Check Security Preferences
    SELECT * INTO prefs
    FROM public.security_preferences
    WHERE user_id = NEW.user_id;

    -- 3. If preference exists and email_on_new_device is true, create notification
    -- Note: This creates an in-app notification. An external worker would need to pick this up to send an actual email.
    IF FOUND AND prefs.email_on_new_device THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            link,
            is_read
        ) VALUES (
            NEW.user_id,
            'security_alert',
            'New Login Detected',
            'We detected a new login to your account from ' || COALESCE(NEW.ip::text, 'unknown IP') || '.',
            '/settings?tab=history',
            FALSE
        );
    END IF;

    RETURN NEW;
END;
$$;
