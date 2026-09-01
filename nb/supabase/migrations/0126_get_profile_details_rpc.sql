-- Create a function to fetch all profile-related data in a single RPC call
-- This replaces multiple parallel queries for the profile page
create or replace function get_profile_details(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_profile jsonb;
  v_stats jsonb;
  v_skills jsonb;
  v_experiences jsonb;
  v_education jsonb;
  v_featured_projects jsonb;
  v_recent_posts jsonb;
  v_social_links jsonb;
begin
  -- 1. Get Core Profile Data
  select to_jsonb(p) into v_user_profile
  from profiles p
  where p.id = p_user_id;

  if v_user_profile is null then
    return null;
  end if;

  -- 2. Get Stats (Connections, Projects, Followers - simplified for now)
  select jsonb_build_object(
    'connections_count', (
      select count(*) 
      from connections 
      where (user_id = p_user_id or connected_user_id = p_user_id) 
      and status = 'accepted'
    ),
    'projects_count', (
      select count(*) 
      from projects 
      where creator_id = p_user_id
    ),
    'followers_count', 0 -- Placeholder until followers system is fully unified
  ) into v_stats;

  -- 3. Get Skills
  select jsonb_agg(s order by s.is_featured desc, s.endorsement_count desc)
  into v_skills
  from skills s
  where s.user_id = p_user_id;

  -- 4. Get Experience
  select jsonb_agg(e order by e.start_date desc)
  into v_experiences
  from experiences e
  where e.user_id = p_user_id;

  -- 5. Get Education
  select jsonb_agg(ed order by ed.start_date desc)
  into v_education
  from education ed
  where ed.user_id = p_user_id;

  -- 6. Get Top 3 Featured/Recent Projects
  select jsonb_agg(sub)
  into v_featured_projects
  from (
    select id, title, description, status, slug, created_at, 'creator' as role
    from projects
    where creator_id = p_user_id
    order by created_at desc
    limit 3
  ) sub;

  -- 7. Get Recent Posts
  select jsonb_agg(sub)
  into v_recent_posts
  from (
    select id, content, created_at, likes_count, comments_count
    from posts
    where user_id = p_user_id
    order by created_at desc
    limit 5
  ) sub;

  -- 8. Get Social Links
  select jsonb_agg(sl order by sl.display_order asc)
  into v_social_links
  from social_links sl
  where sl.user_id = p_user_id;

  -- 9. Combine everything
  return jsonb_build_object(
    'profile', v_user_profile,
    'stats', v_stats,
    'skills', coalesce(v_skills, '[]'::jsonb),
    'experiences', coalesce(v_experiences, '[]'::jsonb),
    'education', coalesce(v_education, '[]'::jsonb),
    'projects', coalesce(v_featured_projects, '[]'::jsonb),
    'posts', coalesce(v_recent_posts, '[]'::jsonb),
    'social_links', coalesce(v_social_links, '[]'::jsonb)
  );
end;
$$;

-- Grant access to authenticated users and service role
grant execute on function get_profile_details(uuid) to authenticated;
grant execute on function get_profile_details(uuid) to service_role;
