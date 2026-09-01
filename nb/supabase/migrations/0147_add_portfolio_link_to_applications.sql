-- Add portfolio_link column to project_applications table
-- This is required for storing the applicant's portfolio URL.
-- It resolves the "column portfolio_link does not exist" error.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'project_applications' 
        AND column_name = 'portfolio_link'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.project_applications 
        ADD COLUMN portfolio_link TEXT;
    END IF;
END $$;
