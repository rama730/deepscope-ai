-- Migration 0051: Add Sprints and Fix Updates Schema
-- Adds project_sprints table, updates project_updates schema, and links tasks to sprints.

-- 1. CREATE project_sprints TABLE
CREATE TABLE IF NOT EXISTS public.project_sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning', -- planning, active, completed, cancelled
    velocity NUMERIC,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADD sprint_id TO project_tasks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_tasks' AND column_name = 'sprint_id') THEN
        ALTER TABLE public.project_tasks ADD COLUMN sprint_id UUID REFERENCES public.project_sprints(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. FIX project_updates SCHEMA
-- Add missing columns expected by ProjectUpdatesTab.tsx
ALTER TABLE public.project_updates
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS is_major BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cross_post_to_explorer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published',
ADD COLUMN IF NOT EXISTS body TEXT; -- Frontend uses 'body', schema had 'content'

-- Make 'content' nullable since we are using 'body' now
ALTER TABLE public.project_updates ALTER COLUMN content DROP NOT NULL;

-- 4. RLS POLICIES FOR project_sprints
ALTER TABLE public.project_sprints ENABLE ROW LEVEL SECURITY;

-- Explicit Grants to ensure access
GRANT ALL ON TABLE public.project_sprints TO authenticated;
GRANT ALL ON TABLE public.project_sprints TO service_role;

-- Drop existing policies if any (handling potential old names)
DROP POLICY IF EXISTS "Sprints visible to members" ON public.project_sprints;
DROP POLICY IF EXISTS "Sprints manageable by members" ON public.project_sprints;
DROP POLICY IF EXISTS "Sprints Select Policy" ON public.project_sprints;
DROP POLICY IF EXISTS "Sprints Manage Policy" ON public.project_sprints;

-- Allow SELECT for members
CREATE POLICY "Sprints Select Policy" ON public.project_sprints
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_sprints.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_sprints.project_id AND pc.user_id = auth.uid())
);

-- Allow ALL (insert, update, delete) for members
CREATE POLICY "Sprints Manage Policy" ON public.project_sprints
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_sprints.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_sprints.project_id AND pc.user_id = auth.uid())
);

-- 6. FIX RLS POLICIES FOR project_updates
-- We found that existing policies might be blocking inserts (Permission Denied 42501)
-- So we will robustly reset them.

GRANT ALL ON TABLE public.project_updates TO authenticated;
GRANT ALL ON TABLE public.project_updates TO service_role;

DROP POLICY IF EXISTS "Updates visible to everyone" ON public.project_updates;
DROP POLICY IF EXISTS "Members can create updates" ON public.project_updates;
DROP POLICY IF EXISTS "Project updates visible to everyone" ON public.project_updates;
DROP POLICY IF EXISTS "Members can manage updates" ON public.project_updates;
DROP POLICY IF EXISTS "Updates Select Policy" ON public.project_updates;
DROP POLICY IF EXISTS "Updates Insert Policy" ON public.project_updates;
DROP POLICY IF EXISTS "Updates Update Policy" ON public.project_updates;
DROP POLICY IF EXISTS "Updates Delete Policy" ON public.project_updates;

-- Allow SELECT for everyone (Public updates) or Members (Team/Followers)
-- For simplicity in this fix, we allow authenticated select, filtering logic handles UI.
CREATE POLICY "Updates Select Policy" ON public.project_updates
FOR SELECT USING (true);

-- Allow INSERT for members
CREATE POLICY "Updates Insert Policy" ON public.project_updates
FOR INSERT WITH CHECK (
    -- Must be authenticated
    auth.role() = 'authenticated' AND
    -- Must be a member of the project
    (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_updates.project_id AND p.creator_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_updates.project_id AND pc.user_id = auth.uid())
    )
);

-- Allow UPDATE for creator or project owner
CREATE POLICY "Updates Update Policy" ON public.project_updates
FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_updates.project_id AND p.creator_id = auth.uid())
);

-- Allow DELETE for creator or project owner
CREATE POLICY "Updates Delete Policy" ON public.project_updates
FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_updates.project_id AND p.creator_id = auth.uid())
);

-- 8. FIX RLS POLICIES FOR project_update_links
-- Ensure links can be created and read
GRANT ALL ON TABLE public.project_update_links TO authenticated;
GRANT ALL ON TABLE public.project_update_links TO service_role;

ALTER TABLE public.project_update_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Update links visible to members" ON public.project_update_links;
DROP POLICY IF EXISTS "Members can create update links" ON public.project_update_links;
DROP POLICY IF EXISTS "Links Select Policy" ON public.project_update_links;
DROP POLICY IF EXISTS "Links Manage Policy" ON public.project_update_links;

-- Allow SELECT for members/public (inherits update visibility logic technically, but loose for now)
CREATE POLICY "Links Select Policy" ON public.project_update_links
FOR SELECT USING (true);

-- Allow ALL for members
CREATE POLICY "Links Manage Policy" ON public.project_update_links
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects p 
            JOIN public.project_updates pu ON pu.project_id = p.id
            WHERE pu.id = project_update_links.update_id AND p.creator_id = auth.uid()) 
    OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc 
            JOIN public.project_updates pu ON pu.project_id = pc.project_id
            WHERE pu.id = project_update_links.update_id AND pc.user_id = auth.uid())
    -- Fallback: if user created the update, they should be able to link things
    OR EXISTS (SELECT 1 FROM public.project_updates pu WHERE pu.id = project_update_links.update_id AND pu.created_by = auth.uid())
);

-- 9. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
