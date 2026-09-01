-- Migration: Add Missing Profile Fields
-- Purpose: Support full profile editing (Prompt 14)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
-- 'bio', 'phone', 'location' already exist in 0001_auth_profile.sql
