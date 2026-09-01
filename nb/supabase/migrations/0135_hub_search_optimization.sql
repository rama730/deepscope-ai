-- Add FTS column to projects table
alter table "projects"
add column "fts" tsvector generated always as (to_tsvector('english', title || ' ' || coalesce(description, '') || ' ' || coalesce(short_description, ''))) stored;

-- Create index for fast search
create index "projects_fts_idx" on "projects" using gin ("fts");
