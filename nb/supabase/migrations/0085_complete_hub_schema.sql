-- Migration: Complete Hub Schema Alignment
-- Purpose: Add Core Schema columns to remaining Hub entities (Files, Chat, Roles).

-- 1. PROJECT FILES
ALTER TABLE public.project_files
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 2. PROJECT CHAT MESSAGES
ALTER TABLE public.project_chat_messages
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE; -- Soft delete for messages

-- 3. PROJECT OPEN ROLES
ALTER TABLE public.project_open_roles
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
