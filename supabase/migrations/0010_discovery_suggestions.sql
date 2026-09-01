-- Create a function to get discovery suggestions (who to follow)
-- Returns users who are not connected to the current user
create or replace function get_discover_suggestions(
  p_user_id uuid,
  p_limit integer default 5
)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  suggestion_reason text
)
language plpgsql
security definer
as $$
begin
  return query
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    'Suggested for you'::text as suggestion_reason
  from profiles p
  where p.id != p_user_id
  and not exists (
    select 1 from connections c
    where (c.user_id = p_user_id and c.connected_user_id = p.id)
       or (c.user_id = p.id and c.connected_user_id = p_user_id)
  )
  order by random()
  limit p_limit;
end;
$$;

grant execute on function get_discover_suggestions to authenticated;
