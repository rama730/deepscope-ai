-- Migration 0150: Fix Messages Schema
-- Adds missing columns to the messages table to ensure compatibility with messaging features.
-- Resolves "column message_type does not exist" and potentially others.

DO $$
BEGIN
    -- 1. message_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'message_type' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN message_type TEXT DEFAULT 'text';
    END IF;

    -- 2. reply_to_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'reply_to_id' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
    END IF;

    -- 3. read_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'read_at' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN read_at TIMESTAMPTZ;
    END IF;

    -- 4. is_edited
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'is_edited' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
    END IF;

    -- 5. edited_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'edited_at' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN edited_at TIMESTAMPTZ;
    END IF;

END $$;
