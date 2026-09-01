-- Migration 0068: Enforce Privacy Policy on Posts
-- Updates RLS to hide posts from users with 'is_private' set to true.

-- Drop the "viewable by everyone" policy
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

-- Create new policy
CREATE POLICY "Posts are viewable by everyone" ON public.posts
FOR SELECT USING (
    -- User can see their own posts
    auth.uid() = user_id
    OR
    -- Everyone can see posts from public profiles
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = public.posts.user_id
        AND (is_private IS NULL OR is_private = false)
    )
    -- Future: Add OR clause for "is connected"
);
