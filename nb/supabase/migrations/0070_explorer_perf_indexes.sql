-- Migration 0070: Explorer Performance Indexes
-- Adds indexes and extensions for scalable search and filtering

-- 1. Enable pg_trgm for efficient text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add GIN index on posts(content) for fast ILIKE searches
CREATE INDEX IF NOT EXISTS idx_posts_content_gin ON public.posts USING gin (content gin_trgm_ops);

-- 3. Add composite indexes for Connections lookups (used in 'following' feed)
CREATE INDEX IF NOT EXISTS idx_connections_user_status ON public.connections (user_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_connected_user_status ON public.connections (connected_user_id, status);

-- 4. Add composite index for Bookmarks lookups (used in 'saved' feed)
-- Note: Assuming table is named 'bookmarks' based on RPC code, but checking 'saved' logic compatibility
CREATE INDEX IF NOT EXISTS idx_bookmarks_lookup ON public.bookmarks (user_id, entity_type, entity_id);

-- 5. Add index for post_likes lookup (used for 'has_liked')
CREATE INDEX IF NOT EXISTS idx_post_likes_lookup ON public.post_likes (user_id, post_id);
