-- Create composite index for efficient filtering and sorting of user notifications
-- This covers the most common query: WHERE user_id = X AND is_read = Y ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications (user_id, is_read, created_at DESC);

-- Index for realtime filters if needed (though user_id is usually sufficient)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications (user_id);
