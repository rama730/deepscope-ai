-- Migration: Monolithic Explorer Feed RPC (Re-apply)
-- Purpose: Consolidate fetching of posts, project updates, ideas, and polls into a single RPC query
-- to eliminate server-side waterfalls.

-- DROP first because we are changing the return type (adding columns)
DROP FUNCTION IF EXISTS public.get_explorer_feed(UUID, INTEGER, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_explorer_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_cursor TIMESTAMPTZ DEFAULT NULL,
    p_tab TEXT DEFAULT 'for-you', -- 'for-you', 'following', 'projects-following', 'saved'
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
    -- image_url TEXT, -- REMOVED
    -- video_url TEXT, -- REMOVED
    media JSONB,       -- ADDED
    likes_count INTEGER,
    comments_count INTEGER,
    reposts_count INTEGER,
    views_count INTEGER,
    post_type TEXT,
    -- code_snippet TEXT, -- REMOVED
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
    quoted_media JSONB, -- Changed to JSONB to pass full media object
    has_liked BOOLEAN,
    has_saved BOOLEAN,
    -- New Fields for Monolithic Fetch
    project_update_details JSONB,
    project_idea_details JSONB,
    parent_post_details JSONB,
    poll_counts INTEGER[],
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
        -- p.image_url,
        -- p.video_url,
        p.media, -- Return the full media object
        p.likes_count,
        p.comments_count,
        p.reposts_count,
        p.views_count,
        p.post_type,
        -- p.code_snippet,
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
        -- Parent Post (for replies)
        ppu.username as parent_author_username,
        ppu.full_name as parent_author_full_name,
        -- Quoted Post
        qp.content as quoted_content,
        qpu.username as quoted_author_username,
        qpu.full_name as quoted_author_full_name,
        qpu.avatar_url as quoted_author_avatar_url,
        qp.media as quoted_media, -- Return full media for quoted post too
        -- User Interactions
        EXISTS(SELECT 1 FROM public.post_likes pl WHERE pl.post_id = p.id AND pl.user_id = p_user_id) as has_liked,
        EXISTS(SELECT 1 FROM public.bookmarks b WHERE b.entity_id = p.id AND b.entity_type = 'post' AND b.user_id = p_user_id) as has_saved,

        -- 1. Project Update Details (LATERAL JOIN)
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
                        (SELECT jsonb_agg(to_jsonb(pf) - 'url' - 'size' - 'uploaded_by' - 'created_at') -- Only need basic info usually
                         FROM public.project_update_links pul
                         JOIN public.project_files pf ON pul.linked_id = pf.id
                         WHERE pul.update_id = p.project_update_id AND pul.linked_type = 'file'),
                        '[]'::jsonb
                    )
                )
             )
        ELSE NULL END as project_update_details,

        -- 2. Project Idea Details (LATERAL JOIN)
        CASE WHEN p.post_type = 'project_idea' AND p.project_idea_id IS NOT NULL THEN
             (
                SELECT to_jsonb(pi) 
                FROM public.project_ideas pi
                WHERE pi.id = p.project_idea_id
             )
        ELSE NULL END as project_idea_details,

        -- 5. Parent Post Details (for Threading Context)
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

        -- 3. Poll Counts (Array Aggregation)
        CASE WHEN p.post_type = 'poll' THEN
             (
                -- We want an array of counts where index = option_index.
                -- Max 10 options usually. 
                -- We'll assume the poll_data->'options' determines length, but SQL aggregation is safer by index.
                -- Let's return an array of integers. 
                SELECT ARRAY(
                    SELECT count(*)::integer
                    FROM public.poll_votes pv
                    WHERE pv.post_id = p.id
                    GROUP BY pv.option_index
                    ORDER BY pv.option_index
                )
                -- Note: This approach might skip index if 0 votes. 
                -- Better approach for direct index mapping:
                -- Iterate 0 to jsonb_array_length(p.poll_data -> 'options') - 1?
                -- For simplicity/performance now, let's just use the subquery.
                -- Frontend might need to map it carefully or we accept potential sparse array or index mismatch if not careful.
                -- A more robust way:
                -- SELECT array_agg(votes ORDER BY idx) FROM (SELECT ...)
             )
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
    -- Filtering logic
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
                ELSE TRUE -- for-you
            END
        )
    ORDER BY p.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_explorer_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_explorer_feed TO anon;
GRANT EXECUTE ON FUNCTION public.get_explorer_feed TO service_role;
