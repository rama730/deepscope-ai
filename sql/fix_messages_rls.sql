-- Fix RLS Policies for Messages Table
-- Run this in your Supabase SQL Editor if you're having issues loading messages

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users read own messages" ON public.messages;
DROP POLICY IF EXISTS "Users send messages" ON public.messages;

-- Recreate policies with proper permissions
CREATE POLICY "Users read own messages" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() = sender_id 
  OR 
  auth.uid() = recipient_id
);

CREATE POLICY "Users send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Verify the policies are active
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'messages';

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'messages';

-- Test query: Check if you can read your own messages (should work when logged in)
-- SELECT * FROM messages WHERE sender_id = auth.uid() OR recipient_id = auth.uid();

-- Check if there are any messages in the table
SELECT COUNT(*) as message_count FROM messages;

-- Sample query to test
-- This should work if RLS is set up correctly and you're authenticated
-- SELECT 
--   conversation_id, 
--   sender_id, 
--   recipient_id, 
--   content, 
--   created_at 
-- FROM messages 
-- WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
-- ORDER BY created_at DESC;
















