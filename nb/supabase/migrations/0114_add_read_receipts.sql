-- Migration 0114: Add Read Receipts System
-- Enables per-message read tracking with timestamps and user information

-- 1. Create message_read_receipts table
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- 2. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_id ON public.message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user_id ON public.message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_read_at ON public.message_read_receipts(read_at);

-- 3. Enable RLS
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for read receipts
-- Users can view read receipts for messages in their conversations
CREATE POLICY "Users can view read receipts in their conversations"
    ON public.message_read_receipts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_read_receipts.message_id
            AND cp.user_id = auth.uid()
        )
    );

-- Users can create read receipts for messages they can read
CREATE POLICY "Users can mark messages as read"
    ON public.message_read_receipts
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_read_receipts.message_id
            AND cp.user_id = auth.uid()
        )
    );

-- Users can update their own read receipts (for re-reading)
CREATE POLICY "Users can update their own read receipts"
    ON public.message_read_receipts
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 5. Grant permissions
GRANT ALL ON TABLE public.message_read_receipts TO authenticated;
-- Note: No sequence grant needed - UUID primary keys use uuid_generate_v4(), not sequences

-- 6. Enable real-time for read receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_read_receipts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;
  END IF;
END
$$;

-- 7. Set REPLICA IDENTITY FULL for DELETE events
ALTER TABLE public.message_read_receipts REPLICA IDENTITY FULL;

-- 8. Create function to mark message as read (idempotent)
CREATE OR REPLACE FUNCTION public.mark_message_read(
    p_message_id UUID,
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.message_read_receipts (message_id, user_id, read_at)
    VALUES (p_message_id, p_user_id, NOW())
    ON CONFLICT (message_id, user_id)
    DO UPDATE SET read_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.mark_message_read(UUID, UUID) TO authenticated;
