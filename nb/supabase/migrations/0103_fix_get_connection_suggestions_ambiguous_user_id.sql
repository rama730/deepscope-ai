-- ==============================================================================
-- MIGRATION 0103: FIX AMBIGUOUS user_id IN get_connection_suggestions
-- In plpgsql, output columns (RETURNS TABLE ...) are variables. Unqualified `user_id`
-- references inside the function can become ambiguous. We fix by qualifying columns.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_connection_suggestions(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  headline TEXT,
  score INTEGER,
  reasons JSONB
) AS $$
DECLARE
  connected_user_ids UUID[];
  user_location_city TEXT;
  user_location_region TEXT;
  user_location_country TEXT;
BEGIN
  -- Get connected user IDs (accepted connections)
  SELECT ARRAY_AGG(DISTINCT CASE
    WHEN c.user_id = user_uuid THEN c.connected_user_id
    ELSE c.user_id
  END)
  INTO connected_user_ids
  FROM connections c
  WHERE c.status = 'accepted'
    AND (c.user_id = user_uuid OR c.connected_user_id = user_uuid);

  -- Get user's normalized location (if present)
  SELECT p.location_city, p.location_region, p.location_country
  INTO user_location_city, user_location_region, user_location_country
  FROM profiles p
  WHERE p.id = user_uuid;

  RETURN QUERY
  WITH candidate_profiles AS (
    SELECT DISTINCT p.id, p.username, p.full_name, p.avatar_url, p.bio, p.location, p.headline,
      p.location_city, p.location_region, p.location_country
    FROM profiles p
    WHERE p.id != user_uuid
      AND (connected_user_ids IS NULL OR p.id != ALL(connected_user_ids))
      AND NOT EXISTS (
        SELECT 1 FROM connections c
        WHERE c.status = 'pending'
          AND ((c.user_id = user_uuid AND c.connected_user_id = p.id)
               OR (c.user_id = p.id AND c.connected_user_id = user_uuid))
      )
  ),
  user_connections_list AS (
    SELECT DISTINCT
      CASE
        WHEN c.user_id = user_uuid THEN c.connected_user_id
        ELSE c.user_id
      END as connected_id
    FROM connections c
    WHERE c.status = 'accepted'
      AND (c.user_id = user_uuid OR c.connected_user_id = user_uuid)
  ),
  scored_profiles AS (
    SELECT
      cp.*,
      (
        -- Mutual connections score (highest weight)
        COALESCE((
          SELECT COUNT(*)
          FROM user_connections_list ucl
          INNER JOIN connections c2 ON (
            (c2.user_id = cp.id OR c2.connected_user_id = cp.id)
            AND c2.status = 'accepted'
            AND (
              (c2.user_id = cp.id AND c2.connected_user_id = ucl.connected_id)
              OR (c2.connected_user_id = cp.id AND c2.user_id = ucl.connected_id)
            )
          )
        ), 0) * 15
        +
        -- Shared skills score
        COALESCE((
          SELECT COUNT(*)
          FROM skills s1
          JOIN skills s2 ON LOWER(s1.skill_name) = LOWER(s2.skill_name)
          WHERE s1.user_id = user_uuid AND s2.user_id = cp.id
        ), 0) * 10
        +
        -- Shared techniques score
        COALESCE((
          SELECT COUNT(*)
          FROM user_techniques t1
          JOIN user_techniques t2 ON LOWER(t1.technique_name) = LOWER(t2.technique_name)
          WHERE t1.user_id = user_uuid AND t2.user_id = cp.id
        ), 0) * 8
        +
        -- Shared tools score
        COALESCE((
          SELECT COUNT(*)
          FROM user_tools u1
          JOIN user_tools u2 ON LOWER(u1.tool_name) = LOWER(u2.tool_name)
          WHERE u1.user_id = user_uuid AND u2.user_id = cp.id
        ), 0) * 6
        +
        -- Tiered location score (city > region > country)
        CASE
          WHEN cp.location_city IS NOT NULL AND user_location_city IS NOT NULL
               AND LOWER(cp.location_city) = LOWER(user_location_city) THEN 25
          WHEN cp.location_region IS NOT NULL AND user_location_region IS NOT NULL
               AND LOWER(cp.location_region) = LOWER(user_location_region) THEN 15
          WHEN cp.location_country IS NOT NULL AND user_location_country IS NOT NULL
               AND LOWER(cp.location_country) = LOWER(user_location_country) THEN 8
          ELSE 0
        END
        +
        -- Profile completeness bonus
        CASE WHEN cp.avatar_url IS NOT NULL THEN 2 ELSE 0 END
        + CASE WHEN cp.bio IS NOT NULL THEN 2 ELSE 0 END
        + CASE WHEN cp.headline IS NOT NULL THEN 2 ELSE 0 END
      ) AS score
    FROM candidate_profiles cp
  ),
  computed_reasons AS (
    SELECT
      sp.*,
      (
        SELECT COUNT(*)
        FROM skills s1
        JOIN skills s2 ON LOWER(s1.skill_name) = LOWER(s2.skill_name)
        WHERE s1.user_id = user_uuid AND s2.user_id = sp.id
      ) AS shared_skills,
      (
        SELECT COUNT(*)
        FROM user_techniques t1
        JOIN user_techniques t2 ON LOWER(t1.technique_name) = LOWER(t2.technique_name)
        WHERE t1.user_id = user_uuid AND t2.user_id = sp.id
      ) AS shared_techniques,
      (
        SELECT COUNT(*)
        FROM user_tools u1
        JOIN user_tools u2 ON LOWER(u1.tool_name) = LOWER(u2.tool_name)
        WHERE u1.user_id = user_uuid AND u2.user_id = sp.id
      ) AS shared_tools,
      CASE
        WHEN sp.location_city IS NOT NULL AND user_location_city IS NOT NULL
             AND LOWER(sp.location_city) = LOWER(user_location_city) THEN 'city'
        WHEN sp.location_region IS NOT NULL AND user_location_region IS NOT NULL
             AND LOWER(sp.location_region) = LOWER(user_location_region) THEN 'region'
        WHEN sp.location_country IS NOT NULL AND user_location_country IS NOT NULL
             AND LOWER(sp.location_country) = LOWER(user_location_country) THEN 'country'
        ELSE 'none'
      END AS location_match_level
    FROM scored_profiles sp
  )
  SELECT
    cr.id AS user_id,
    cr.username,
    cr.full_name,
    cr.avatar_url,
    cr.bio,
    cr.location,
    cr.headline,
    cr.score::INTEGER,
    jsonb_build_object(
      'mutual_connections', (
        SELECT COUNT(*)
        FROM user_connections_list ucl
        INNER JOIN connections c2 ON (
          (c2.user_id = cr.id OR c2.connected_user_id = cr.id)
          AND c2.status = 'accepted'
          AND (
            (c2.user_id = cr.id AND c2.connected_user_id = ucl.connected_id)
            OR (c2.connected_user_id = cr.id AND c2.user_id = ucl.connected_id)
          )
        )
      ),
      'shared_skills', cr.shared_skills,
      'shared_techniques', cr.shared_techniques,
      'shared_tools', cr.shared_tools,
      'location_match_level', cr.location_match_level,
      'same_location', (cr.location_match_level != 'none')
    ) AS reasons
  FROM computed_reasons cr
  WHERE cr.score > 0
  ORDER BY cr.score DESC, cr.full_name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


