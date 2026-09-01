-- Add rejection tracking columns to project_applications table

DO $$
BEGIN
    -- Add rejection_message column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'project_applications' 
        AND column_name = 'rejection_message'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.project_applications 
        ADD COLUMN rejection_message TEXT;
    END IF;

    -- Add rejected_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'project_applications' 
        AND column_name = 'rejected_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.project_applications 
        ADD COLUMN rejected_at TIMESTAMPTZ;
    END IF;
END $$;
