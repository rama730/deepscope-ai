-- Add status column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
