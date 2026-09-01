-- Add recipient_id column to messages table
-- This column is required for direct messaging logic used in applications.
-- It resolves the "column recipient_id does not exist" error.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'recipient_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages 
        ADD COLUMN recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;
