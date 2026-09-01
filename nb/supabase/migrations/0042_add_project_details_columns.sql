-- Migration 0042: Add Missing Project Details Columns
-- Adds fields for Problem Statement, Solution Overview, and Links

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS problem_statement TEXT,
ADD COLUMN IF NOT EXISTS solution_overview TEXT,
ADD COLUMN IF NOT EXISTS github_repository TEXT,
ADD COLUMN IF NOT EXISTS live_demo_url TEXT;
