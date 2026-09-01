-- Migration 0122: Comprehensive Explorer Performance Indexes
-- Adds composite indexes for common filter combinations and engagement sorting

-- 1. Composite index for main feed queries (status, is_reply, created_at)
-- Used for: for-you feed, filtering out replies, sorting by date
CREATE INDEX IF NOT EXISTS idx_posts_feed_main 
ON public.posts(status, is_reply, created_at DESC) 
WHERE status = 'published' AND is_reply = false;

-- 2. Composite index for post type filtering
-- Used for: filtering by post_type (standard, project_update, etc.)
CREATE INDEX IF NOT EXISTS idx_posts_type_created 
ON public.posts(post_type, created_at DESC) 
WHERE status = 'published' AND is_reply = false;

-- 3. Composite index for user-specific feeds
-- Used for: user profile feeds, following feeds
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
ON public.posts(user_id, created_at DESC) 
WHERE status = 'published' AND is_reply = false;

-- 4. Composite index for engagement sorting (likes)
-- Used for: sorting by popularity/likes
CREATE INDEX IF NOT EXISTS idx_posts_likes_created 
ON public.posts(likes_count DESC, created_at DESC) 
WHERE status = 'published' AND is_reply = false;

-- 5. Composite index for engagement sorting (comments)
-- Used for: sorting by engagement/comments
CREATE INDEX IF NOT EXISTS idx_posts_comments_created 
ON public.posts(comments_count DESC, created_at DESC) 
WHERE status = 'published' AND is_reply = false;

-- 6. Composite index for tags filtering
-- Used for: filtering posts by tags
CREATE INDEX IF NOT EXISTS idx_posts_tags_gin 
ON public.posts USING gin(tags) 
WHERE status = 'published' AND is_reply = false;

-- 7. Composite index for project-related posts
-- Used for: filtering posts by project
CREATE INDEX IF NOT EXISTS idx_posts_project_created 
ON public.posts(project_id, created_at DESC) 
WHERE project_id IS NOT NULL AND status = 'published' AND is_reply = false;

-- 8. Composite index for thread_root_id lookups
-- Used for: grouping replies under root posts
CREATE INDEX IF NOT EXISTS idx_posts_thread_root 
ON public.posts(thread_root_id, created_at ASC) 
WHERE thread_root_id IS NOT NULL;

-- 9. Composite index for parent_post_id lookups
-- Used for: fetching replies to a post
CREATE INDEX IF NOT EXISTS idx_posts_parent_created 
ON public.posts(parent_post_id, created_at ASC) 
WHERE parent_post_id IS NOT NULL;

-- 10. Index for post_likes count queries
-- Used for: efficient counting of likes per post
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id 
ON public.post_likes(post_id);

-- 11. Index for post_reposts count queries
-- Used for: efficient counting of reposts per post
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_id 
ON public.post_reposts(post_id);

-- 12. Composite index for bookmarks by entity
-- Used for: checking if user has saved a post
CREATE INDEX IF NOT EXISTS idx_bookmarks_entity_lookup 
ON public.bookmarks(entity_type, entity_id, user_id) 
WHERE entity_type = 'post';

-- 13. Index for time-based filtering
-- Used for: filtering posts by time range (today, week, month)
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc 
ON public.posts(created_at DESC) 
WHERE status = 'published' AND is_reply = false;

-- 14. Composite index for search queries
-- Used for: full-text search on content
CREATE INDEX IF NOT EXISTS idx_posts_content_search 
ON public.posts USING gin(to_tsvector('english', content)) 
WHERE status = 'published' AND is_reply = false;

-- 15. Index for quoted posts
-- Used for: fetching quoted post data
CREATE INDEX IF NOT EXISTS idx_posts_quoted_post_id 
ON public.posts(quoted_post_id) 
WHERE quoted_post_id IS NOT NULL;
