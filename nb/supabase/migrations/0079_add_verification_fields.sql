-- Migration: Add Verification Fields
-- Purpose: Support custom email verification flow

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email TEXT; -- Adding email to profiles for easier lookups/consistency if needed, though strictly it's in auth.users. 
-- Ideally we sync email from auth.users via trigger, but for this specific "check-email" feature and "verification", storing it here is convenient.
-- Let's stick to the prompt's "email verification fields".

-- Sync existing emails (optional, best effort if we had access to auth.users here but we can't cross-schema easily in simple migration without permissions)
-- We will rely on the trigger UPDATE to sync it moving forward or just use it for new users.

-- Actually, for 'Async email availability check', querying auth.users is disallowed for anon. 
-- Querying public.profiles is better if we have RLS 'false' for specific columns? No, RLS is row-based.
-- We will implement the check-email endpoint using SERVICE_ROLE on the backend, so we don't strictly *need* email in profiles, but it helps.
-- The prompt asked "Add email verification fields", so token/expires are key.
