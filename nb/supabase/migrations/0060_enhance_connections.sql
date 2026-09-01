-- Migration 0060: Enhance Connections System
-- Adds privacy settings, connection metadata, and helper functions

-- Add privacy setting to profiles table (for connection requests)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS connection_privacy TEXT DEFAULT 'public' CHECK (connection_privacy IN ('public', 'connections_only', 'nobody'));

-- Add accepted_at timestamp to connections for analytics
ALTER TABLE public.connections 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Add index for accepted connections queries
CREATE INDEX IF NOT EXISTS idx_connections_accepted ON public.connections(status, accepted_at DESC) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_connections_pending_created ON public.connections(status, created_at DESC) WHERE status = 'pending';

-- Function to get mutual connections count
CREATE OR REPLACE FUNCTION get_mutual_connections_count(user1_id UUID, user2_id UUID)
RETURNS INTEGER AS $$
DECLARE
  mutual_count INTEGER;
BEGIN
  WITH user1_connections AS (
    SELECT CASE 
      WHEN user_id = user1_id THEN connected_user_id 
      ELSE user_id 
    END AS connected_id
    FROM connections
    WHERE status = 'accepted'
      AND (user_id = user1_id OR connected_user_id = user1_id)
  ),
  user2_connections AS (
    SELECT CASE 
      WHEN user_id = user2_id THEN connected_user_id 
      ELSE user_id 
    END AS connected_id
    FROM connections
    WHERE status = 'accepted'
      AND (user_id = user2_id OR connected_user_id = user2_id)
  )
  SELECT COUNT(*)
  INTO mutual_count
  FROM user1_connections u1
  INNER JOIN user2_connections u2 ON u1.connected_id = u2.connected_id;
  
  RETURN COALESCE(mutual_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get connection statistics for a user
CREATE OR REPLACE FUNCTION get_connection_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_connections', (
      SELECT COUNT(*)::INTEGER
      FROM connections
      WHERE status = 'accepted'
        AND (user_id = user_uuid OR connected_user_id = user_uuid)
    ),
    'pending_incoming', (
      SELECT COUNT(*)::INTEGER
      FROM connections
      WHERE status = 'pending'
        AND connected_user_id = user_uuid
    ),
    'pending_outgoing', (
      SELECT COUNT(*)::INTEGER
      FROM connections
      WHERE status = 'pending'
        AND user_id = user_uuid
    ),
    'connections_this_month', (
      SELECT COUNT(*)::INTEGER
      FROM connections
      WHERE status = 'accepted'
        AND (user_id = user_uuid OR connected_user_id = user_uuid)
        AND accepted_at >= date_trunc('month', CURRENT_DATE)
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set accepted_at when status changes to accepted
CREATE OR REPLACE FUNCTION set_connection_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    NEW.accepted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_accepted_at ON public.connections;
CREATE TRIGGER trigger_set_accepted_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION set_connection_accepted_at();

-- Update existing accepted connections to have accepted_at = created_at
UPDATE public.connections
SET accepted_at = created_at
WHERE status = 'accepted' AND accepted_at IS NULL;

-- Function to get personalized connection suggestions with reasons
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
  user_skill_names TEXT[];
  user_location TEXT;
  user_project_tags TEXT[];
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

  -- Get user's skills
  SELECT ARRAY_AGG(LOWER(skill_name))
  INTO user_skill_names
  FROM skills
  WHERE user_id = user_uuid;

  -- Get user's location
  SELECT location INTO user_location
  FROM profiles
  WHERE id = user_uuid;

  -- Get user's project tags
  SELECT ARRAY_AGG(DISTINCT UNNEST(tags))
  INTO user_project_tags
  FROM projects
  WHERE creator_id = user_uuid AND tags IS NOT NULL;

  RETURN QUERY
  WITH candidate_profiles AS (
    SELECT DISTINCT p.id, p.username, p.full_name, p.avatar_url, p.bio, p.location, p.headline
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
        WHEN user_id = user_uuid THEN connected_user_id
        ELSE user_id
      END as connected_id
    FROM connections
    WHERE status = 'accepted'
      AND (user_id = user_uuid OR connected_user_id = user_uuid)
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
        -- Same location score
        CASE WHEN cp.location IS NOT NULL AND user_location IS NOT NULL 
             AND LOWER(cp.location) = LOWER(user_location) THEN 20 ELSE 0 END
        +
        -- Shared project tags score
        COALESCE((
          SELECT COUNT(*)
          FROM projects p1
          CROSS JOIN projects p2
          WHERE p1.creator_id = user_uuid
            AND p2.creator_id = cp.id
            AND p1.tags IS NOT NULL
            AND p2.tags IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM UNNEST(p1.tags) t1
              JOIN UNNEST(p2.tags) t2 ON LOWER(t1) = LOWER(t2)
            )
        ), 0) * 5
        +
        -- Project collaboration score (if they've worked on same projects)
        COALESCE((
          SELECT COUNT(DISTINCT pc1.project_id)
          FROM project_collaborators pc1
          JOIN project_collaborators pc2 ON pc1.project_id = pc2.project_id
          WHERE pc1.user_id = user_uuid AND pc2.user_id = cp.id
        ), 0) * 25
        +
        -- Profile completeness bonus
        CASE WHEN cp.avatar_url IS NOT NULL THEN 2 ELSE 0 END
        + CASE WHEN cp.bio IS NOT NULL THEN 2 ELSE 0 END
        + CASE WHEN cp.headline IS NOT NULL THEN 2 ELSE 0 END
      ) AS score
    FROM candidate_profiles cp
  )
  SELECT 
    sp.id AS user_id,
    sp.username,
    sp.full_name,
    sp.avatar_url,
    sp.bio,
    sp.location,
    sp.headline,
    sp.score::INTEGER,
    jsonb_build_object(
      'mutual_connections', (
        SELECT COUNT(*)
        FROM user_connections_list ucl
        INNER JOIN connections c2 ON (
          (c2.user_id = sp.id OR c2.connected_user_id = sp.id)
          AND c2.status = 'accepted'
          AND (
            (c2.user_id = sp.id AND c2.connected_user_id = ucl.connected_id)
            OR (c2.connected_user_id = sp.id AND c2.user_id = ucl.connected_id)
          )
        )
      ),
      'shared_skills', (
        SELECT COUNT(*)
        FROM skills s1
        JOIN skills s2 ON LOWER(s1.skill_name) = LOWER(s2.skill_name)
        WHERE s1.user_id = user_uuid AND s2.user_id = sp.id
      ),
      'same_location', CASE WHEN sp.location IS NOT NULL AND user_location IS NOT NULL 
                           AND LOWER(sp.location) = LOWER(user_location) THEN true ELSE false END,
      'shared_projects', (
        SELECT COUNT(DISTINCT pc1.project_id)
        FROM project_collaborators pc1
        JOIN project_collaborators pc2 ON pc1.project_id = pc2.project_id
        WHERE pc1.user_id = user_uuid AND pc2.user_id = sp.id
      )
    ) AS reasons
  FROM scored_profiles sp
  WHERE sp.score > 0
  ORDER BY sp.score DESC, sp.full_name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
