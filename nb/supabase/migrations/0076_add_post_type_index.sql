-- Migration: Add index on post_type
-- Purpose: Optimize Explorer feed filtering when filtering by specific post types (e.g. 'poll', 'project_update').

CREATE INDEX IF NOT EXISTS idx_posts_type ON public.posts(post_type);
