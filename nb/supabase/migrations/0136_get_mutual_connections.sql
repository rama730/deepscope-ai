-- Create a function to get mutual connections between two users
create or replace function get_mutual_connections(
  p_viewer_id uuid,
  p_profile_id uuid,
  p_limit int default 3
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_count int;
  v_mutual_users jsonb;
begin
  -- 1. Calculate the total count of mutual connections
  select count(*)
  into v_count
  from connections c1
  join connections c2 
    on (c1.connected_user_id = c2.connected_user_id or c1.connected_user_id = c2.user_id)
  where 
    -- c1 is connection for viewer
    (c1.user_id = p_viewer_id or c1.connected_user_id = p_viewer_id)
    and c1.status = 'accepted'
    -- c2 is connection for profile owner
    and (c2.user_id = p_profile_id or c2.connected_user_id = p_profile_id)
    and c2.status = 'accepted'
    -- Ensure we are finding the *other* person who is mutual
    and case 
      when c1.user_id = p_viewer_id then c1.connected_user_id 
      else c1.user_id 
    end = case 
      when c2.user_id = p_profile_id then c2.connected_user_id 
      else c2.user_id 
    end;

  -- 2. fetch the top N mutual connections with their avatars
  select jsonb_agg(sub)
  into v_mutual_users
  from (
    select p.id, p.username, p.avatar_url
    from connections c1
    join connections c2 
      on (c1.connected_user_id = c2.connected_user_id or c1.connected_user_id = c2.user_id)
    join profiles p 
      on p.id = (
        case 
          when c1.user_id = p_viewer_id then c1.connected_user_id 
          else c1.user_id 
        end
      )
    where 
      (c1.user_id = p_viewer_id or c1.connected_user_id = p_viewer_id)
      and c1.status = 'accepted'
      and (c2.user_id = p_profile_id or c2.connected_user_id = p_profile_id)
      and c2.status = 'accepted'
      and case 
        when c1.user_id = p_viewer_id then c1.connected_user_id 
        else c1.user_id 
      end = case 
        when c2.user_id = p_profile_id then c2.connected_user_id 
        else c2.user_id 
      end
    limit p_limit
  ) sub;

  return jsonb_build_object(
    'count', coalesce(v_count, 0),
    'users', coalesce(v_mutual_users, '[]'::jsonb)
  );
end;
$$;

-- Grant access
grant execute on function get_mutual_connections(uuid, uuid, int) to authenticated;
grant execute on function get_mutual_connections(uuid, uuid, int) to service_role;
