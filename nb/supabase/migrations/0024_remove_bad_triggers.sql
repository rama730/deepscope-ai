-- Migration to remove the notification triggers that are causing connection failures
-- We will restore them later once we debug the issue.

DROP TRIGGER IF EXISTS on_connection_request ON public.connections;
DROP TRIGGER IF EXISTS on_connection_accepted ON public.connections;
DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS on_post_comment ON public.post_comments;

-- We can leave the functions, but dropping triggers stops them from running.
