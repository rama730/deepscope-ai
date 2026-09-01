-- ==============================================================================
-- MIGRATION 0090: BACKFILL PROJECT SLUGS
-- Purpose: Ensure every project has a human-friendly slug so URLs never fall back to UUID.
-- ==============================================================================

-- Backfill slugs for projects missing them.
with base as (
  select
    p.id,
    p.created_at,
    -- slugify title
    coalesce(
      nullif(
        regexp_replace(lower(trim(p.title)), '[^a-z0-9]+', '-', 'g'),
        ''
      ),
      'project'
    ) as base_slug
  from public.projects p
  where p.slug is null or length(trim(p.slug)) = 0
),
numbered as (
  select
    id,
    case
      when base_slug = '-' then 'project'
      else trim(both '-' from base_slug)
    end as base_slug,
    row_number() over (partition by trim(both '-' from base_slug) order by created_at asc, id asc) as rn
  from base
),
final as (
  select
    id,
    case
      when rn = 1 then base_slug
      else base_slug || '-' || rn::text
    end as slug
  from numbered
)
update public.projects p
set slug = f.slug
from final f
where p.id = f.id;


