-- Create RPC to get all application modal data in one query
CREATE OR REPLACE FUNCTION get_project_apply_data(p_project_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_profile json;
  v_project_details json;
  v_roles json;
BEGIN
  v_user_id := auth.uid();

  -- Get User Profile
  IF v_user_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', id,
      'display_name', display_name,
      'email', email
    ) INTO v_user_profile
    FROM profiles
    WHERE id = v_user_id;
  END IF;

  -- Get Project Details
  SELECT json_build_object(
    'title', title,
    'slug', slug
  ) INTO v_project_details
  FROM projects
  WHERE id = p_project_id;

  -- Get Roles with Filled Counts
  WITH role_counts AS (
      SELECT
          lower(role) as role_lower,
          count(*) as count
      FROM project_collaborators
      WHERE project_id = p_project_id
      GROUP BY lower(role)
  )
  SELECT json_agg(json_build_object(
      'id', r.id,
      'role', r.role,
      'count', r.count,
      'filled', COALESCE(rc.count, 0),
      'description', r.description,
      'skills', r.skills
  )) INTO v_roles
  FROM project_open_roles r
  LEFT JOIN role_counts rc ON lower(r.role) = rc.role_lower
  WHERE r.project_id = p_project_id;
  
  -- Return combined result
  RETURN json_build_object(
    'user_profile', v_user_profile,
    'project', v_project_details,
    'roles', COALESCE(v_roles, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_project_apply_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_apply_data(uuid) TO anon;
