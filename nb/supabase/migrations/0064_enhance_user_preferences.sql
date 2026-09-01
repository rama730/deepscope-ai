-- Migration 0064: Enhance User Preferences
-- Adds appearance settings to the user_preferences table for cross-device sync.

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT 'indigo',
ADD COLUMN IF NOT EXISTS density TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'system';
