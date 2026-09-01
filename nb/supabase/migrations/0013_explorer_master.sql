-- ==============================================================================
-- MIGRATION 0013: EXPLORER MASTER SCHEMA
-- This file consolidates all Explorer-related tables, columns, and policies.
-- Run this to ensure your database fully supports the Explorer features.
-- ==============================================================================

-- 1. POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    
    -- Media & Rich Content
    media JSONB, -- { type: 'image', urls: [] }
    poll_data JSONB,
    collaboration_data JSONB,
    achievement_data JSONB,
    cta JSONB,
    link_preview JSONB,
    content_warning TEXT,
    
    -- Metadata
    post_type TEXT DEFAULT 'standard', -- standard, project_update, idea, poll, collaboration, achievement
    tags TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'published', -- published, scheduled, draft, archived
    scheduled_for TIMESTAMPTZ,
    mentioned_user_ids UUID[] DEFAULT '{}',
    
    -- Relationships
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    project_update_id UUID REFERENCES public.project_updates(id) ON DELETE SET NULL,
    project_idea_id UUID REFERENCES public.project_ideas(id) ON DELETE SET NULL,
    
    -- Threading
    parent_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    thread_root_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    is_reply BOOLEAN DEFAULT FALSE,
    reply_count INTEGER DEFAULT 0,
    
    -- Quoting
    quoted_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    is_quote BOOLEAN DEFAULT FALSE,
    
    -- Counters
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reposts_count INTEGER DEFAULT 0,
    bookmarks_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);

-- Ensure all columns exist (idempotent)
DO $$ 
BEGIN 
    BEGIN ALTER TABLE public.posts ADD COLUMN status TEXT DEFAULT 'published'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.posts ADD COLUMN scheduled_for TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.posts ADD COLUMN mentioned_user_ids UUID[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.posts ADD COLUMN project_idea_id UUID REFERENCES public.project_ideas(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.posts ADD COLUMN collaboration_data JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.posts ADD COLUMN achievement_data JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.posts ADD COLUMN poll_data JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.posts ADD COLUMN cta JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE public.posts ADD COLUMN content_warning TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- RLS for Posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;


-- 2. POST LIKES
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes viewable by everyone" ON public.post_likes;
CREATE POLICY "Likes viewable by everyone" ON public.post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like" ON public.post_likes;
CREATE POLICY "Users can like" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike" ON public.post_likes;
CREATE POLICY "Users can unlike" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.post_likes TO authenticated;
GRANT SELECT ON public.post_likes TO anon;


-- 3. POST COMMENTS
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments viewable by everyone" ON public.post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can comment" ON public.post_comments;
CREATE POLICY "Users can comment" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can edit own comments" ON public.post_comments;
CREATE POLICY "Users can edit own comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.post_comments TO authenticated;
GRANT SELECT ON public.post_comments TO anon;


-- 4. POST REPOSTS
CREATE TABLE IF NOT EXISTS public.post_reposts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reposts viewable by everyone" ON public.post_reposts;
CREATE POLICY "Reposts viewable by everyone" ON public.post_reposts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can repost" ON public.post_reposts;
CREATE POLICY "Users can repost" ON public.post_reposts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reposts" ON public.post_reposts;
CREATE POLICY "Users can delete own reposts" ON public.post_reposts FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.post_reposts TO authenticated;
GRANT SELECT ON public.post_reposts TO anon;


-- 5. BOOKMARKS
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'post', 'project'
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON public.bookmarks TO authenticated;


-- 6. POST MENTIONS
CREATE TABLE IF NOT EXISTS public.post_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentions viewable by everyone" ON public.post_mentions;
CREATE POLICY "Mentions viewable by everyone" ON public.post_mentions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create mentions" ON public.post_mentions;
CREATE POLICY "Users can create mentions" ON public.post_mentions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

GRANT ALL ON public.post_mentions TO authenticated;
GRANT SELECT ON public.post_mentions TO anon;


-- 7. POST PROJECT MENTIONS
CREATE TABLE IF NOT EXISTS public.post_project_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.post_project_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project mentions viewable by everyone" ON public.post_project_mentions;
CREATE POLICY "Project mentions viewable by everyone" ON public.post_project_mentions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create project mentions" ON public.post_project_mentions;
CREATE POLICY "Users can create project mentions" ON public.post_project_mentions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

GRANT ALL ON public.post_project_mentions TO authenticated;
GRANT SELECT ON public.post_project_mentions TO anon;


-- 8. REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, resolved, dismissed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

GRANT ALL ON public.reports TO authenticated;


-- 9. MUTES & BLOCKS & NOT INTERESTED
CREATE TABLE IF NOT EXISTS public.mutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    muter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    muted_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(muter_id, muted_id)
);

ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own mutes" ON public.mutes;
CREATE POLICY "Users manage own mutes" ON public.mutes FOR ALL USING (auth.uid() = muter_id);
GRANT ALL ON public.mutes TO authenticated;


CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own blocks" ON public.blocks;
CREATE POLICY "Users manage own blocks" ON public.blocks FOR ALL USING (auth.uid() = blocker_id);
GRANT ALL ON public.blocks TO authenticated;


CREATE TABLE IF NOT EXISTS public.not_interested (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

ALTER TABLE public.not_interested ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own not_interested" ON public.not_interested;
CREATE POLICY "Users manage own not_interested" ON public.not_interested FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON public.not_interested TO authenticated;


-- 10. FUNCTIONS & TRIGGERS

-- Increment View Count (RPC)
CREATE OR REPLACE FUNCTION increment_post_view_count(post_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET views_count = views_count + 1
  WHERE id = post_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_post_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_view_count(UUID) TO anon;


-- Update Post Counters Trigger
CREATE OR REPLACE FUNCTION update_post_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'post_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'post_comments' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'post_reposts' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Re-create Triggers (Drop first to avoid errors)
DROP TRIGGER IF EXISTS trigger_update_likes ON public.post_likes;
CREATE TRIGGER trigger_update_likes
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_counters();

DROP TRIGGER IF EXISTS trigger_update_comments ON public.post_comments;
CREATE TRIGGER trigger_update_comments
    AFTER INSERT OR DELETE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_counters();

DROP TRIGGER IF EXISTS trigger_update_reposts ON public.post_reposts;
CREATE TRIGGER trigger_update_reposts
    AFTER INSERT OR DELETE ON public.post_reposts
    FOR EACH ROW EXECUTE FUNCTION update_post_counters();


-- Bookmark Counter Trigger
CREATE OR REPLACE FUNCTION update_bookmark_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.entity_type = 'post' THEN
        UPDATE public.posts SET bookmarks_count = bookmarks_count + 1 WHERE id = NEW.entity_id;
    ELSIF TG_OP = 'DELETE' AND OLD.entity_type = 'post' THEN
        UPDATE public.posts SET bookmarks_count = GREATEST(0, bookmarks_count - 1) WHERE id = OLD.entity_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bookmarks ON public.bookmarks;
CREATE TRIGGER trigger_update_bookmarks
    AFTER INSERT OR DELETE ON public.bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_bookmark_counts();
