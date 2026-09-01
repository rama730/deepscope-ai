-- Add display_order to skills
alter table public.skills
add column display_order integer default 0;

-- Add display_order to experiences
alter table public.experiences
add column display_order integer default 0;

-- Function to update display order efficiently
create or replace function update_skills_order(p_items jsonb)
returns void
language plpgsql
security definer
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    update public.skills
    set display_order = (item->>'order')::int
    where id = (item->>'id')::uuid
    and user_id = auth.uid(); -- Ensure ownership
  end loop;
end;
$$;
