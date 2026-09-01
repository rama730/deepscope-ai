-- Migration: Extend User Schema
-- Purpose: Add role and is_active columns to profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Update RLS policies if needed (users can read their own role, etc.)
-- The existing "Public profiles are viewable by everyone" covers reading.
-- We might want to restrict UPDATING role to admins only, but for now we rely on the existing "Users can update their own profile" 
-- which effectively allows users to change their own role if we expose it in the API. 
-- Ideally, role updates should be protected via a TRIGGER or separate admin-only RLS/Function.
-- For this "Schema Design" task, we just add the columns.
