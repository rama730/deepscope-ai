-- Migration: Fix post deletion cascade
-- Author: Antigravity
-- Description: Changes parent_post_id and thread_root_id foreign keys to ON DELETE CASCADE
-- This ensures that when a post is deleted, all its replies (and their replies) are also deleted.

BEGIN;

-- 1. Drop existing constraints
-- We use IF EXISTS to be safe, though they should exist.
ALTER TABLE public.posts 
DROP CONSTRAINT IF EXISTS posts_parent_post_id_fkey;

ALTER TABLE public.posts 
DROP CONSTRAINT IF EXISTS posts_thread_root_id_fkey;

-- 2. Add new constraints with CASCADE
ALTER TABLE public.posts
ADD CONSTRAINT posts_parent_post_id_fkey
FOREIGN KEY (parent_post_id)
REFERENCES public.posts(id)
ON DELETE CASCADE;

ALTER TABLE public.posts
ADD CONSTRAINT posts_thread_root_id_fkey
FOREIGN KEY (thread_root_id)
REFERENCES public.posts(id)
ON DELETE CASCADE;

COMMIT;
