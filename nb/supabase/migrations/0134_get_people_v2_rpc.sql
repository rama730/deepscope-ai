-- Create a specific RPC for fetching people with filters
-- This replaces complex client-side query building in PeopleClient.tsx

CREATE OR REPLACE FUNCTION get_people_v2(
    p_user_id uuid,
    p_limit integer DEFAULT 20,
    p_cursor timestamptz DEFAULT NULL,
    p_search_query text DEFAULT NULL,
    p_location_filter text[] DEFAULT NULL,
    p_skills_filter text[] DEFAULT NULL,
    p_project_tags_filter text[] DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    username text,
    full_name text,
    avatar_url text,
    bio text,
    location text,
    created_at timestamptz,
    skills jsonb,
    created_projects jsonb,
    connection_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_search_pattern text;
BEGIN
    -- Prepare search pattern
    IF p_search_query IS NOT NULL AND TRIM(p_search_query) <> '' THEN
        v_search_pattern := '%' || TRIM(p_search_query) || '%';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.bio,
        p.location,
        p.created_at,
        -- Aggregate skills
        COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object('skill_name', s.skill_name))
                FROM main.skills s
                WHERE s.user_id = p.id
            ),
            '[]'::jsonb
        ) as skills,
        -- Aggregate projects (simple subset for filtering/display)
        COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', proj.id, 
                    'title', proj.title, 
                    'technologies_used', proj.technologies_used
                ))
                FROM main.projects proj
                WHERE proj.creator_id = p.id
                ORDER BY proj.updated_at DESC
                LIMIT 3
            ),
            '[]'::jsonb
        ) as created_projects,
        -- Compute connection status relative to caller
        COALESCE(
            (
                SELECT c.status
                FROM main.connections c
                WHERE (c.user_id = p_user_id AND c.connected_user_id = p.id)
                   OR (c.user_id = p.id AND c.connected_user_id = p_user_id)
                LIMIT 1
            ),
            'none'
        ) as connection_status
    FROM main.profiles p
    WHERE 
        -- Exclude self
        p.id <> p_user_id
        -- Cursor pagination
        AND (p_cursor IS NULL OR p.created_at < p_cursor)
        -- Search Query
        AND (
            v_search_pattern IS NULL 
            OR p.full_name ILIKE v_search_pattern 
            OR p.username ILIKE v_search_pattern 
            OR p.bio ILIKE v_search_pattern
            OR p.location ILIKE v_search_pattern
        )
        -- Location Filter
        AND (
            p_location_filter IS NULL 
            OR p_location_filter = '{}'::text[]
            OR p.location = ANY(p_location_filter)
        )
        -- Skills Filter (Optimization: Using EXISTS instead of join for distinctness)
        AND (
            p_skills_filter IS NULL 
            OR p_skills_filter = '{}'::text[]
            OR EXISTS (
                SELECT 1 FROM main.skills s
                WHERE s.user_id = p.id
                AND s.skill_name = ANY(p_skills_filter)
            )
        )
        -- Project Tags Filter
        AND (
            p_project_tags_filter IS NULL
            OR p_project_tags_filter = '{}'::text[]
            OR EXISTS (
                SELECT 1 FROM main.projects proj
                WHERE proj.creator_id = p.id
                -- Check if technologies_used array overlaps with filter
                AND proj.technologies_used && p_project_tags_filter
            )
        )
    ORDER BY p.created_at DESC
    LIMIT p_limit;
END;
$$;
