-- Migration 0115: Add Message Forwarding
-- Enables forwarding messages to other conversations with context

-- 1. Add forwarding columns to messages table
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS forwarded_from_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS forwarded_from_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS forwarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS forward_context TEXT;

-- 2. Create indexes for forwarded message queries
CREATE INDEX IF NOT EXISTS idx_messages_forwarded_from ON public.messages(forwarded_from_message_id) WHERE forwarded_from_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_forwarded_by ON public.messages(forwarded_by) WHERE forwarded_by IS NOT NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN public.messages.forwarded_from_message_id IS 'Reference to the original message that was forwarded';
COMMENT ON COLUMN public.messages.forwarded_from_conversation_id IS 'Reference to the original conversation the message came from';
COMMENT ON COLUMN public.messages.forwarded_by IS 'User who forwarded this message';
COMMENT ON COLUMN public.messages.forward_context IS 'Optional context/comment added when forwarding';
