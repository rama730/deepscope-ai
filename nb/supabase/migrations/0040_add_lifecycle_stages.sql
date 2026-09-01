-- Migration 0040: Add Lifecycle Stages to Projects
-- Adds support for the Visual Roadmap feature

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS lifecycle_stages TEXT[] DEFAULT ARRAY['Planning', 'Design', 'Development', 'Testing', 'Deployment', 'Maintenance'],
ADD COLUMN IF NOT EXISTS current_stage_index INTEGER DEFAULT 0;

-- Update existing projects to have default stages if null
UPDATE public.projects 
SET lifecycle_stages = ARRAY['Planning', 'Design', 'Development', 'Testing', 'Deployment', 'Maintenance']
WHERE lifecycle_stages IS NULL;

UPDATE public.projects 
SET current_stage_index = 0
WHERE current_stage_index IS NULL;
