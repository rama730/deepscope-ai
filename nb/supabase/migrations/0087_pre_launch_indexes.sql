-- Migration: Pre-Launch Performance Indexes
-- Purpose: Add missing indexes identified during pre-launch audit to ensure scalable performance.
-- ID: 0087

-- 1. TASKS: Optimize "My Tasks" and Filtering
-- Critical for queries filtering by assignee (Dashboard) and status (Kanban/Lists).
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON public.project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON public.project_tasks(status);

-- 2. PROFILES: Optimize User Search and Mentions
-- Critical for "@mention" lookups and "Find Collaborator" search.

-- Ensure pg_trgm is enabled for fuzzy text search (ILIKE)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index on username for exact lookups (routing/mentions)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- GIN indexes for fast partial matching search (e.g. "joh" -> "John Doe")
CREATE INDEX IF NOT EXISTS idx_profiles_username_gin ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_gin ON public.profiles USING gin (full_name gin_trgm_ops);
