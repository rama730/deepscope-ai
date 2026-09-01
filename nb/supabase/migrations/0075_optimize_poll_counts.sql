-- Migration: Optimize Poll Counts
-- Purpose: Denormalize poll vote counts onto the posts table to avoid expensive subqueries in the feed.

-- 1. Add poll_counts column to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_counts INTEGER[] DEFAULT '{}';

-- 2. Create Trigger Function to maintain poll_counts
CREATE OR REPLACE FUNCTION public.update_poll_votes_count()
RETURNS TRIGGER AS $$
DECLARE
    v_idx INT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- SQL Arrays are 1-based, assuming option_index is 0-based
        v_idx := NEW.option_index + 1;
        UPDATE public.posts 
        SET poll_counts[v_idx] = COALESCE(poll_counts[v_idx], 0) + 1 
        WHERE id = NEW.post_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_idx := OLD.option_index + 1;
        UPDATE public.posts 
        SET poll_counts[v_idx] = GREATEST(0, COALESCE(poll_counts[v_idx], 0) - 1) 
        WHERE id = OLD.post_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- If option_index changed (unlikely for simple vote, but possible if vote changed)
        IF OLD.option_index IS DISTINCT FROM NEW.option_index THEN
             -- Decrement OLD
             UPDATE public.posts 
             SET poll_counts[OLD.option_index + 1] = GREATEST(0, COALESCE(poll_counts[OLD.option_index + 1], 0) - 1) 
             WHERE id = OLD.post_id;
             
             -- Increment NEW
             UPDATE public.posts 
             SET poll_counts[NEW.option_index + 1] = COALESCE(poll_counts[NEW.option_index + 1], 0) + 1 
             WHERE id = NEW.post_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trigger_update_poll_votes ON public.poll_votes;
CREATE TRIGGER trigger_update_poll_votes
    AFTER INSERT OR UPDATE OR DELETE ON public.poll_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_poll_votes_count();

-- 4. Backfill existing poll counts
-- This uses the same logic as the old RPC to calculate initial state
WITH calculated_counts AS (
    SELECT 
        post_id,
        ARRAY_AGG(vote_count ORDER BY option_index) as new_counts
    FROM (
        SELECT post_id, option_index, count(*)::int as vote_count
        FROM public.poll_votes
        GROUP BY post_id, option_index
    ) sub
    GROUP BY post_id
)
UPDATE public.posts p
SET poll_counts = cc.new_counts
FROM calculated_counts cc
WHERE p.id = cc.post_id;


-- 5. Update get_explorer_feed RPC to use the new column
-- (Re-defining the function from 0074 but with the optimized poll_counts selection)

CREATE OR REPLACE FUNCTION public.get_explorer_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_cursor TIMESTAMPTZ DEFAULT NULL,
    p_tab TEXT DEFAULT 'for-you',
    p_type_filter TEXT DEFAULT 'all',
    p_time_filter TEXT DEFAULT 'all',
    p_search_query TEXT DEFAULT NULL,
    p_tag TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    user_id UUID,
    project_id UUID,
    media JSONB,
    likes_count INTEGER,
    comments_count INTEGER,
    reposts_count INTEGER,
    views_count INTEGER,
    post_type TEXT,
    link_preview JSONB,
    tags TEXT[],
    parent_post_id UUID,
    quoted_post_id UUID,

    author_username TEXT,
    author_full_name TEXT,
    author_avatar_url TEXT,
    project_title TEXT,
    project_slug TEXT,
    project_status TEXT,
    project_type TEXT,
    parent_author_username TEXT,
    parent_author_full_name TEXT,
    quoted_content TEXT,
    quoted_author_username TEXT,
    quoted_author_full_name TEXT,
    quoted_author_avatar_url TEXT,
    quoted_media JSONB,
    has_liked BOOLEAN,
    has_saved BOOLEAN,
    project_update_details JSONB,
    project_idea_details JSONB,
    parent_post_details JSONB,
    poll_counts INTEGER[], -- Optimized
    user_poll_vote INTEGER
) AS $$
DECLARE
    v_time_cutoff TIMESTAMPTZ;
BEGIN
    -- Handle time filter
    IF p_time_filter = 'today' THEN
        v_time_cutoff := NOW() - INTERVAL '1 day';
    ELSIF p_time_filter = 'week' THEN
        v_time_cutoff := NOW() - INTERVAL '1 week';
    ELSIF p_time_filter = 'month' THEN
        v_time_cutoff := NOW() - INTERVAL '1 month';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.content,
        p.created_at,
        p.user_id,
        p.project_id,
        p.media,
        p.likes_count,
        p.comments_count,
        p.reposts_count,
        p.views_count,
        p.post_type,
        p.link_preview,
        p.tags,
        p.parent_post_id,
        p.quoted_post_id,

        -- Author
        au.username,
        au.full_name,
        au.avatar_url,
        -- Project
        proj.title,
        proj.slug,
        proj.status,
        proj.project_type,
        -- Parent Post
        ppu.username as parent_author_username,
        ppu.full_name as parent_author_full_name,
        -- Quoted Post
        qp.content as quoted_content,
        qpu.username as quoted_author_username,
        qpu.full_name as quoted_author_full_name,
        qpu.avatar_url as quoted_author_avatar_url,
        qp.media as quoted_media,
        -- User Interactions
        EXISTS(SELECT 1 FROM public.post_likes pl WHERE pl.post_id = p.id AND pl.user_id = p_user_id) as has_liked,
        EXISTS(SELECT 1 FROM public.bookmarks b WHERE b.entity_id = p.id AND b.entity_type = 'post' AND b.user_id = p_user_id) as has_saved,

        -- 1. Project Update Details
        CASE WHEN p.post_type = 'project_update' AND p.project_update_id IS NOT NULL THEN
             (
                SELECT jsonb_build_object(
                    'tasks', COALESCE(
                        (SELECT jsonb_agg(to_jsonb(pt) - 'description' - 'created_at' - 'updated_at' - 'created_by')
                         FROM public.project_update_links pul
                         JOIN public.project_tasks pt ON pul.linked_id = pt.id
                         WHERE pul.update_id = p.project_update_id AND pul.linked_type = 'task'),
                        '[]'::jsonb
                    ),
                    'files', COALESCE(
                        (SELECT jsonb_agg(to_jsonb(pf) - 'url' - 'size' - 'uploaded_by' - 'created_at')
                         FROM public.project_update_links pul
                         JOIN public.project_files pf ON pul.linked_id = pf.id
                         WHERE pul.update_id = p.project_update_id AND pul.linked_type = 'file'),
                        '[]'::jsonb
                    )
                )
             )
        ELSE NULL END as project_update_details,

        -- 2. Project Idea Details
        CASE WHEN p.post_type = 'project_idea' AND p.project_idea_id IS NOT NULL THEN
             (
                SELECT to_jsonb(pi) 
                FROM public.project_ideas pi
                WHERE pi.id = p.project_idea_id
             )
        ELSE NULL END as project_idea_details,

        -- 5. Parent Post Details
        CASE WHEN p.parent_post_id IS NOT NULL THEN
            jsonb_build_object(
                'id', pp.id,
                'content', pp.content,
                'created_at', pp.created_at,
                'user_id', pp.user_id,
                'media', pp.media,
                'likes_count', pp.likes_count,
                'comments_count', pp.comments_count,
                'reposts_count', pp.reposts_count,
                'views_count', pp.views_count,
                'profiles', jsonb_build_object(
                    'username', ppu.username,
                    'full_name', ppu.full_name,
                    'avatar_url', ppu.avatar_url
                )
            )
        ELSE NULL END as parent_post_details,

        -- 3. Poll Counts (OPTIMIZED)
        -- Use the pre-calculated column instead of subquery
        -- We return it directly. Frontend handles array.
        CASE WHEN p.post_type = 'poll' THEN
             COALESCE(p.poll_counts, '{}'::INTEGER[])
        ELSE NULL END as poll_counts,

        -- 4. User Poll Vote
        CASE WHEN p.post_type = 'poll' AND p_user_id IS NOT NULL THEN
             (
                SELECT option_index
                FROM public.poll_votes pv
                WHERE pv.post_id = p.id AND pv.user_id = p_user_id
                LIMIT 1
             )
        ELSE NULL END as user_poll_vote

    FROM public.posts p
    JOIN public.profiles au ON p.user_id = au.id
    LEFT JOIN public.projects proj ON p.project_id = proj.id
    LEFT JOIN public.posts pp ON p.parent_post_id = pp.id
    LEFT JOIN public.profiles ppu ON pp.user_id = ppu.id
    LEFT JOIN public.posts qp ON p.quoted_post_id = qp.id
    LEFT JOIN public.profiles qpu ON qp.user_id = qpu.id
    WHERE
        (p_cursor IS NULL OR p.created_at < p_cursor)
        AND (p_type_filter = 'all' OR p.post_type = p_type_filter)
        AND (v_time_cutoff IS NULL OR p.created_at >= v_time_cutoff)
        AND (
            p_search_query IS NULL
            OR p.content ILIKE '%' || p_search_query || '%'
        )
        AND (
            p_tag IS NULL
            OR p_tag = ANY(p.tags)
            OR p.content ILIKE '%#' || p_tag || '%'
        )
        -- BLOCK/MUTE FILTERING (from previous phase)
        AND (
            p_user_id IS NULL OR (
                NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = p_user_id AND b.blocked_id = p.user_id)
                AND
                NOT EXISTS (SELECT 1 FROM public.mutes m WHERE m.muter_id = p_user_id AND m.muted_id = p.user_id)
            )
        )
        AND (
            CASE
                WHEN p_tab = 'saved' THEN
                    EXISTS(SELECT 1 FROM public.bookmarks b2 WHERE b2.entity_id = p.id AND b2.entity_type = 'post' AND b2.user_id = p_user_id)
                WHEN p_tab = 'following' THEN
                    EXISTS(
                        SELECT 1 FROM public.connections c
                        WHERE c.status = 'accepted'
                        AND ( (c.user_id = p_user_id AND c.connected_user_id = p.user_id) OR (c.connected_user_id = p_user_id AND c.user_id = p.user_id) )
                    )
                WHEN p_tab = 'projects-following' THEN
                    EXISTS(
                        SELECT 1 FROM public.project_followers pf
                        WHERE pf.user_id = p_user_id AND pf.project_id = p.project_id
                    )
                ELSE TRUE
            END
        )
    ORDER BY p.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_explorer_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_explorer_feed TO anon;
GRANT EXECUTE ON FUNCTION public.get_explorer_feed TO service_role;
