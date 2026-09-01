-- =====================================================
-- COMPREHENSIVE RLS AND MISSING TABLES FIX
-- =====================================================

-- ==========================
-- 1. ENABLE RLS ON ALL TABLES
-- ==========================

-- Profile tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteering ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Connection tables
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Project tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_open_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_update_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_ideas ENABLE ROW LEVEL SECURITY;

-- Notification tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Post tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- ==========================
-- 2. CREATE MISSING TABLES
-- ==========================

-- Custom Feeds Table
CREATE TABLE IF NOT EXISTS public.custom_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    query JSONB NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custom_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom feeds" ON public.custom_feeds
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom feeds" ON public.custom_feeds
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom feeds" ON public.custom_feeds
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom feeds" ON public.custom_feeds
    FOR DELETE USING (auth.uid() = user_id);

-- Post Drafts Table
CREATE TABLE IF NOT EXISTS public.post_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    media_urls TEXT[],
    scheduled_at TIMESTAMPTZ,
    last_saved_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.post_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own drafts" ON public.post_drafts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts" ON public.post_drafts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts" ON public.post_drafts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts" ON public.post_drafts
    FOR DELETE USING (auth.uid() = user_id);

-- Muted Words Table
CREATE TABLE IF NOT EXISTS public.muted_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, word)
);

ALTER TABLE public.muted_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own muted words" ON public.muted_words
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own muted words" ON public.muted_words
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own muted words" ON public.muted_words
    FOR DELETE USING (auth.uid() = user_id);

-- ==========================
-- 3. FIX NOTIFICATIONS RLS
-- ==========================

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- ==========================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ==========================

CREATE INDEX IF NOT EXISTS idx_custom_feeds_user_id ON public.custom_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_post_drafts_user_id ON public.post_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_muted_words_user_id ON public.muted_words(user_id);
