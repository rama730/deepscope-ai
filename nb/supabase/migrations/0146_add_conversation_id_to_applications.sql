-- Add conversation_id column to project_applications table
-- This is required for linking applications to chat conversations.
-- It works in tandem with the apply_to_project RPC.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'project_applications' 
        AND column_name = 'conversation_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.project_applications 
        ADD COLUMN conversation_id UUID REFERENCES public.conversations(id);
    END IF;
END $$;
