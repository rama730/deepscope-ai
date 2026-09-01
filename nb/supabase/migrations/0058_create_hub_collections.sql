-- 58. Create Hub Collections
-- Based on types/hub.ts Collection interface

-- 1. COLLECTIONS TABLE
CREATE TABLE public.collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Policies for collections
CREATE POLICY "Collections are viewable by owner" 
    ON public.collections FOR SELECT 
    USING (auth.uid() = owner_id);

CREATE POLICY "Public collections are viewable by everyone" 
    ON public.collections FOR SELECT 
    USING (is_public = true);

CREATE POLICY "Users can create collections" 
    ON public.collections FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own collections" 
    ON public.collections FOR UPDATE 
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own collections" 
    ON public.collections FOR DELETE 
    USING (auth.uid() = owner_id);


-- 2. COLLECTION PROJECTS TABLE (Junction)
CREATE TABLE public.collection_projects (
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection_id, project_id)
);

-- Enable RLS
ALTER TABLE public.collection_projects ENABLE ROW LEVEL SECURITY;

-- Policies for collection_projects
-- Visible if the user owns the collection OR the collection is public
CREATE POLICY "Collection projects viewable by collection owner or if public" 
    ON public.collection_projects FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.collections c 
            WHERE c.id = collection_projects.collection_id 
            AND (c.owner_id = auth.uid() OR c.is_public = true)
        )
    );

-- Insert/Delete only by collection owner
CREATE POLICY "Collection owner can add projects" 
    ON public.collection_projects FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.collections c 
            WHERE c.id = collection_projects.collection_id 
            AND c.owner_id = auth.uid()
        )
    );

CREATE POLICY "Collection owner can remove projects" 
    ON public.collection_projects FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.collections c 
            WHERE c.id = collection_projects.collection_id 
            AND c.owner_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_collections_owner_id ON public.collections(owner_id);
CREATE INDEX idx_collection_projects_collection_id ON public.collection_projects(collection_id);
CREATE INDEX idx_collection_projects_project_id ON public.collection_projects(project_id);
