-- Migration 0065: Add Privacy Fields
-- Adds is_private column to profiles to control account visibility.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Update RLS policies to respect privacy settings
-- (Note: Specific policy updates for posts/content would typically follow, 
-- but this migration establishes the base flag).
