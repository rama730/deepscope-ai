-- Migration 0055: Add slug and project_id columns to projects table
-- Adds URL-friendly slugs and display IDs (PRJ-{ACRONYM}) for cleaner URLs and UI

-- Add slug column for URL-friendly identifiers
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add project_id column for display IDs (PRJ-{ACRONYM})
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_id TEXT;

-- Create unique index on slug for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug) WHERE slug IS NOT NULL;

-- Create unique index on project_id for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_project_id ON public.projects(project_id) WHERE project_id IS NOT NULL;

-- Add index on slug for case-insensitive lookups (useful for queries)
CREATE INDEX IF NOT EXISTS idx_projects_slug_lower ON public.projects(LOWER(slug)) WHERE slug IS NOT NULL;
