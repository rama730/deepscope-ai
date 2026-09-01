-- Fix Messaging RLS (Robust Version)
-- This migration fixes:
-- 1. Recursion errors (500)
-- 2. Permission denied errors (42501)
-- 3. Policy already exists errors (42710) - by ensuring Drops work

-- 1. Helper Function
-- Bypasses RLS to avoid recursion when checking membership
CREATE OR REPLACE FUNCTION is_conversation_member(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM conversation_members 
    WHERE conversation_id = p_conversation_id 
    AND user_id = auth.uid()
  );
END;
$$;

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION is_conversation_member TO authenticated, service_role;

-- 2. Drop Old Policies (ALL OF THEM)
-- We strictly check for existence to avoid "does not exist" errors, 
-- but also ensure they are GONE before creating new ones.
DROP POLICY IF EXISTS "Users can view conversations they joined" ON conversations;
DROP POLICY IF EXISTS "Users can view members of their conversations" ON conversation_members;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_members;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_members;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;

-- 3. New Policies

-- Conversations
CREATE POLICY "Users can view conversations they joined"
  ON conversations FOR SELECT
  USING (is_conversation_member(id));

-- Conversation Members
CREATE POLICY "Users can view members of their conversations"
  ON conversation_members FOR SELECT
  USING (is_conversation_member(conversation_id));

CREATE POLICY "Users can join conversations"
  ON conversation_members FOR INSERT
  WITH CHECK (user_id = auth.uid());
  
CREATE POLICY "Users can leave conversations"
  ON conversation_members FOR DELETE
  USING (user_id = auth.uid());

-- Messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (is_conversation_member(conversation_id));

CREATE POLICY "Users can insert messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    is_conversation_member(conversation_id)
  );

-- 4. GRANT PERMISSIONS (Critical Fix for 42501)
GRANT ALL ON TABLE conversations TO authenticated, service_role;
GRANT ALL ON TABLE conversation_members TO authenticated, service_role;
GRANT ALL ON TABLE messages TO authenticated, service_role;
