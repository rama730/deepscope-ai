-- ==============================================================================
-- MIGRATION 0011: ADD ROLE DETAILS
-- Add missing columns to project_open_roles table to support the new create wizard.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Add description if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_open_roles' AND column_name = 'description') THEN
        ALTER TABLE public.project_open_roles ADD COLUMN description TEXT;
    END IF;

    -- 2. Add experience_level if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_open_roles' AND column_name = 'experience_level') THEN
        ALTER TABLE public.project_open_roles ADD COLUMN experience_level TEXT DEFAULT 'any';
    END IF;

    -- 3. Add compensation_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_open_roles' AND column_name = 'compensation_type') THEN
        ALTER TABLE public.project_open_roles ADD COLUMN compensation_type TEXT DEFAULT 'unpaid';
    END IF;

    -- 4. Add compensation_details if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_open_roles' AND column_name = 'compensation_details') THEN
        ALTER TABLE public.project_open_roles ADD COLUMN compensation_details TEXT;
    END IF;
END $$;
