-- Function to fetch trending tags efficiently
-- Returns top tags based on usage in posts from the last 90 days (relaxed for consistency)
DROP FUNCTION IF EXISTS get_trending_tags(int);

CREATE OR REPLACE FUNCTION get_trending_tags(limit_count int DEFAULT 5)
RETURNS TABLE (
  tag text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH tag_counts AS (
    -- Extract tags from the 'tags' array column
    SELECT unnest(tags) as tag_name
    FROM posts
    WHERE created_at > (now() - interval '90 days')
    
    UNION ALL
    
    -- Extract regex matches (hashtags) from content
    SELECT (regexp_matches(content, '#([a-zA-Z0-9_]+)', 'g'))[1] as tag_name
    FROM posts
    WHERE created_at > (now() - interval '90 days')
  )
  SELECT 
    lower(tag_name) as tag, 
    count(*) as count
  FROM tag_counts
  WHERE tag_name IS NOT NULL
  GROUP BY lower(tag_name)
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get suggestions for "Who to follow"
-- Prioritizes non-connected users with shared skills or high profile strength
DROP FUNCTION IF EXISTS get_discover_suggestions(uuid, int);

CREATE OR REPLACE FUNCTION get_discover_suggestions(p_user_id uuid, p_limit int DEFAULT 3)
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  headline text,
  "suggestionReason" text
) AS $$
DECLARE
  v_user_skills text[];
BEGIN
  -- Get user's skills
  SELECT array_agg(skill_name) INTO v_user_skills
  FROM skills
  WHERE user_id = p_user_id;

  RETURN QUERY
  WITH potential_matches AS (
    SELECT 
      p.id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.headline,
      -- Simple scoring: +10 for each matching skill, +1 for profile strength
      (
        SELECT count(*) * 10 
        FROM skills s 
        WHERE s.user_id = p.id 
        AND s.skill_name = ANY(v_user_skills)
      ) + (COALESCE(p.profile_strength, 0) / 10) as score,
      (
        SELECT string_agg(s.skill_name, ', ')
        FROM skills s 
        WHERE s.user_id = p.id 
        AND s.skill_name = ANY(v_user_skills)
        LIMIT 2
      ) as shared_skills
    FROM profiles p
    WHERE p.id != p_user_id
    AND NOT EXISTS (
      -- Exclude existing connections (pending or accepted)
      SELECT 1 FROM connections c
      WHERE (c.user_id = p_user_id AND c.connected_user_id = p.id)
         OR (c.user_id = p.id AND c.connected_user_id = p_user_id)
    )
  )
  SELECT 
    pm.id,
    pm.full_name,
    pm.username,
    pm.avatar_url,
    pm.headline,
    CASE 
      WHEN pm.shared_skills IS NOT NULL AND pm.shared_skills != '' THEN 'Shared interests: ' || pm.shared_skills
      ELSE 'Popular in your network'
    END as "suggestionReason"
  FROM potential_matches pm
  ORDER BY pm.score DESC, random()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
