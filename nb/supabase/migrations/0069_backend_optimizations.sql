-- Migration 0069: Backend Optimizations
-- Implements RPCs for logical integrity and performance

-- ==============================================================================
-- 1. Transactional Project Applications
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.apply_to_project(
    p_project_id UUID,
    p_user_id UUID,
    p_role_name TEXT,
    p_message TEXT,
    p_work_timings TEXT DEFAULT NULL,
    p_portfolio_link TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_creator_id UUID;
    v_project_slug TEXT;
    v_project_title TEXT;
    v_application_id UUID;
    v_conversation_id UUID;
    v_message_content JSONB;
BEGIN
    -- 1. Get project details and validate
    SELECT creator_id, slug, title INTO v_creator_id, v_project_slug, v_project_title
    FROM public.projects
    WHERE id = p_project_id;

    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'Project not found';
    END IF;

    IF v_creator_id = p_user_id THEN
        RAISE EXCEPTION 'Cannot apply to your own project';
    END IF;

    -- 2. Check for existing applications
    IF EXISTS (
        SELECT 1 FROM public.project_applications
        WHERE project_id = p_project_id AND applicant_id = p_user_id AND status IN ('pending', 'accepted')
    ) THEN
        RAISE EXCEPTION 'You have already applied to this project';
    END IF;

    -- 3. Find or Create Conversation
    SELECT c.id INTO v_conversation_id
    FROM public.conversations c
    JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id
    JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE cp1.user_id = p_user_id 
      AND cp2.user_id = v_creator_id
      AND c.is_group = FALSE;

    IF v_conversation_id IS NULL THEN
        INSERT INTO public.conversations (is_group) VALUES (FALSE) RETURNING id INTO v_conversation_id;
        INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES 
            (v_conversation_id, p_user_id),
            (v_conversation_id, v_creator_id);
    END IF;

    -- 4. Create Application
    INSERT INTO public.project_applications (
        project_id, applicant_id, role_applied_for, message, work_timings, status
    ) VALUES (
        p_project_id, p_user_id, p_role_name, p_message, p_work_timings, 'pending'
    ) RETURNING id INTO v_application_id;

    -- 5. Send Message
    v_message_content := jsonb_build_object(
        'project_id', p_project_id,
        'project_slug', v_project_slug,
        'project_title', v_project_title,
        'role', p_role_name,
        'message', p_message,
        'work_timings', p_work_timings,
        'portfolio_link', p_portfolio_link,
        'status', 'pending',
        'application_id', v_application_id,
        'created_at', NOW()
    );

    INSERT INTO public.messages (
        conversation_id, sender_id, recipient_id, content, message_type
    ) VALUES (
        v_conversation_id, p_user_id, v_creator_id, v_message_content::text, 'project_application'
    );

    RETURN jsonb_build_object(
        'application_id', v_application_id,
        'conversation_id', v_conversation_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.apply_to_project TO authenticated;


-- ==============================================================================
-- 2. Connections System Refactor
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.send_connection_request(
    p_sender_id UUID,
    p_target_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_privacy_setting TEXT;
    v_existing_status TEXT;
    v_mutual_count INTEGER;
BEGIN
    -- Check self
    IF p_sender_id = p_target_id THEN
        RAISE EXCEPTION 'Cannot connect to yourself';
    END IF;

    -- Check existing
    SELECT status INTO v_existing_status FROM public.connections
    WHERE (user_id = p_sender_id AND connected_user_id = p_target_id)
       OR (user_id = p_target_id AND connected_user_id = p_sender_id);

    IF v_existing_status = 'accepted' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already connected');
    ELSIF v_existing_status = 'pending' THEN
         -- Check if it's an incoming request that we should accept
         IF EXISTS (
            SELECT 1 FROM public.connections 
            WHERE user_id = p_target_id AND connected_user_id = p_sender_id AND status = 'pending'
         ) THEN
            UPDATE public.connections 
            SET status = 'accepted', accepted_at = NOW()
            WHERE user_id = p_target_id AND connected_user_id = p_sender_id;
            RETURN jsonb_build_object('success', true, 'message', 'Connection accepted');
         ELSE
            RETURN jsonb_build_object('success', true, 'message', 'Request already sent');
         END IF;
    END IF;

    -- Check Privacy
    SELECT connection_privacy INTO v_privacy_setting FROM public.profiles WHERE id = p_target_id;

    IF v_privacy_setting = 'nobody' THEN
        RAISE EXCEPTION 'User does not accept connection requests';
    ELSIF v_privacy_setting = 'connections_only' THEN
        -- Check mutuals
        -- (Ideally reuse get_mutual_connections_count but simple query here avoids dependency issues if names change)
        SELECT COUNT(*) INTO v_mutual_count
        FROM public.connections c1
        JOIN public.connections c2 ON (
            (c2.user_id = c1.connected_user_id OR c2.connected_user_id = c1.connected_user_id)
             AND c2.user_id != p_sender_id -- exclude self
        )
        WHERE (c1.user_id = p_sender_id OR c1.connected_user_id = p_sender_id) AND c1.status = 'accepted'
          AND (c2.user_id = p_target_id OR c2.connected_user_id = p_target_id) AND c2.status = 'accepted';
        
        IF v_mutual_count = 0 THEN
            RAISE EXCEPTION 'User only accepts requests from mutual connections';
        END IF;
    END IF;

    -- Insert
    INSERT INTO public.connections (user_id, connected_user_id, status)
    VALUES (p_sender_id, p_target_id, 'pending');

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.send_connection_request TO authenticated;


-- ==============================================================================
-- 3. Message Performance Optimization
-- Replaces previous version from 0059_enhance_messages_system.sql
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_messages_paginated(
  conv_id UUID,
  before_timestamp TIMESTAMPTZ DEFAULT NULL,
  page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  recipient_id UUID,
  content TEXT,
  message_type TEXT,
  reply_to_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  is_edited BOOLEAN,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  sender_profile JSONB,
  reply_to JSONB,
  reactions JSONB,
  attachments JSONB,
  is_pinned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH page_messages AS (
    SELECT m.id
    FROM public.messages m
    WHERE m.conversation_id = conv_id
      AND (before_timestamp IS NULL OR m.created_at < before_timestamp)
    ORDER BY m.created_at DESC
    LIMIT page_size
  ),
  message_reactions_agg AS (
    SELECT 
      r.message_id,
      jsonb_agg(jsonb_build_object(
        'emoji', r.emoji,
        'user_id', r.user_id,
        'user_name', p.full_name
      )) as reactions
    FROM public.message_reactions r
    JOIN public.profiles p ON r.user_id = p.id
    WHERE r.message_id IN (SELECT id FROM page_messages)
    GROUP BY r.message_id
  ),
  message_attachments_agg AS (
    SELECT 
      a.message_id,
      jsonb_agg(jsonb_build_object(
        'id', a.id,
        'type', a.file_type,
        'url', a.file_url,
        'name', a.file_name,
        'size', a.file_size,
        'thumbnail_url', a.thumbnail_url
      )) as attachments
    FROM public.message_attachments a
    WHERE a.message_id IN (SELECT id FROM page_messages)
    GROUP BY a.message_id
  )
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.recipient_id,
    m.content,
    m.message_type,
    m.reply_to_id,
    m.created_at,
    m.updated_at,
    m.edited_at,
    m.is_edited,
    m.read_at,
    m.delivered_at,
    jsonb_build_object(
      'full_name', p.full_name,
      'username', p.username,
      'avatar_url', p.avatar_url
    ) as sender_profile,
    CASE WHEN rm.id IS NOT NULL THEN
      jsonb_build_object(
        'id', rm.id,
        'content', rm.content,
        'sender_name', rp.full_name
      )
    ELSE NULL END as reply_to,
    COALESCE(mra.reactions, '[]'::jsonb) as reactions,
    COALESCE(maa.attachments, '[]'::jsonb) as attachments,
    m.is_pinned
  FROM public.messages m
  JOIN page_messages pm ON m.id = pm.id
  JOIN public.profiles p ON m.sender_id = p.id
  LEFT JOIN public.messages rm ON m.reply_to_id = rm.id
  LEFT JOIN public.profiles rp ON rm.sender_id = rp.id
  LEFT JOIN message_reactions_agg mra ON m.id = mra.message_id
  LEFT JOIN message_attachments_agg maa ON m.id = maa.message_id
  ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_messages_paginated TO authenticated;


-- ==============================================================================
-- 4. Explorer Feed Optimization
-- ==============================================================================
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
    image_url TEXT,
    video_url TEXT,
    likes_count INTEGER,
    comments_count INTEGER,
    reposts_count INTEGER,
    views_count INTEGER,
    post_type TEXT,
    code_snippet TEXT,
    link_preview JSONB,
    tags TEXT[],
    parent_post_id UUID,
    quoted_post_id UUID,
    is_repost BOOLEAN,
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
    quoted_media TEXT,
    has_liked BOOLEAN,
    has_saved BOOLEAN
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
        p.image_url,
        p.video_url,
        p.likes_count,
        p.comments_count,
        p.reposts_count,
        p.views_count,
        p.post_type,
        p.code_snippet,
        p.link_preview,
        p.tags,
        p.parent_post_id,
        p.quoted_post_id,
        p.is_repost,
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
        COALESCE(qp.image_url, qp.video_url) as quoted_media,
        -- User Interactions (Optimization: fetching this per row is still better than N+1 clients, 
        -- but a LEFT JOIN on likes/bookmarks tables filtered by p_user_id is best)
        EXISTS(SELECT 1 FROM public.post_likes pl WHERE pl.post_id = p.id AND pl.user_id = p_user_id) as has_liked,
        EXISTS(SELECT 1 FROM public.bookmarks b WHERE b.entity_id = p.id AND b.entity_type = 'post' AND b.user_id = p_user_id) as has_saved
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
