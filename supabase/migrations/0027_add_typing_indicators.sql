-- Add Typing Indicators
-- Requires: 0026_add_unread_tracking.sql

-- Create typing_indicators table to track when users are typing
CREATE TABLE IF NOT EXISTS typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view typing indicators for conversations they're in
CREATE POLICY "Users can view typing indicators in their conversations"
  ON typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = typing_indicators.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can update their own typing status
CREATE POLICY "Users can update their own typing status"
  ON typing_indicators FOR UPDATE
  USING (user_id = auth.uid());

-- Users can insert their own typing status
CREATE POLICY "Users can insert their own typing status"
  ON typing_indicators FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own typing status
CREATE POLICY "Users can delete their own typing status"
  ON typing_indicators FOR DELETE
  USING (user_id = auth.uid());

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation_user 
ON typing_indicators(conversation_id, user_id, updated_at);

-- Function to clean up old typing indicators (older than 5 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE typing_indicators
  SET is_typing = FALSE
  WHERE updated_at < NOW() - INTERVAL '5 seconds';
END;
$$;

-- Enable realtime for typing_indicators (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'typing_indicators'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
  END IF;
END $$;
