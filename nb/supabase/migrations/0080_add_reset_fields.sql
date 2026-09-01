-- Migration: Add Password Reset Fields
-- Purpose: Support custom password reset flow

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMPTZ;
