-- Ensure the foreign key exists and force a schema cache reload
DO $$
BEGIN
    -- Try to drop it if it exists (standard name)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_sender_id_fkey') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_sender_id_fkey;
    END IF;

    -- Re-add it explicitly
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
END $$;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';