-- ==============================================================================
-- MIGRATION 0003: HUB (PROJECTS & COLLABORATION)
-- ==============================================================================

-- 1. PROJECTS TABLE
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    vision TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, completed, archived
    tags TEXT[] DEFAULT '{}',
    technologies_used TEXT[] DEFAULT '{}',
    view_count INTEGER NOT NULL DEFAULT 0,
    popularity_score INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    project_type TEXT,
    custom_project_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. PROJECT COLLABORATORS
CREATE TABLE public.project_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- 3. PROJECT FOLLOWERS
CREATE TABLE public.project_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_followers ENABLE ROW LEVEL SECURITY;

-- 4. PROJECT OPEN ROLES (For recruitment)
CREATE TABLE public.project_open_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_open_roles ENABLE ROW LEVEL SECURITY;

-- 5. PROJECT TASKS
CREATE TABLE public.project_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo', -- todo, in_progress, done
    priority TEXT DEFAULT 'medium',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- 6. PROJECT FILES
CREATE TABLE public.project_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    category TEXT DEFAULT 'general',
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- 7. PROJECT CHAT
CREATE TABLE public.project_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited BOOLEAN DEFAULT FALSE
);
ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;

-- 8. PROJECT PRESENCE
CREATE TABLE public.project_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(project_id, user_id)
);
ALTER TABLE public.project_presence ENABLE ROW LEVEL SECURITY;

-- 9. PROJECT UPDATES
CREATE TABLE public.project_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    update_type TEXT NOT NULL DEFAULT 'general', -- general, milestone, announcement
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_update_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    update_id UUID NOT NULL REFERENCES public.project_updates(id) ON DELETE CASCADE,
    linked_type TEXT NOT NULL, -- task, file
    linked_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.project_update_links ENABLE ROW LEVEL SECURITY;

-- 10. PROJECT IDEAS
CREATE TABLE public.project_ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    short_description TEXT,
    problem_statement TEXT,
    roles_needed TEXT[],
    status TEXT DEFAULT 'draft',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    converted_to_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.project_ideas ENABLE ROW LEVEL SECURITY;

-- 11. RLS POLICIES

-- Projects
CREATE POLICY "Projects are viewable by everyone" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their projects" ON public.projects FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their projects" ON public.projects FOR DELETE USING (auth.uid() = creator_id);

-- Collaborators
CREATE POLICY "Collaborators viewable by everyone" ON public.project_collaborators FOR SELECT USING (true);
CREATE POLICY "Project creators manage collaborators" ON public.project_collaborators FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_collaborators.project_id AND creator_id = auth.uid())
);

-- Followers
CREATE POLICY "Project followers viewable by everyone" ON public.project_followers FOR SELECT USING (true);
CREATE POLICY "Users can follow projects" ON public.project_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow projects" ON public.project_followers FOR DELETE USING (auth.uid() = user_id);

-- Open Roles
CREATE POLICY "Open roles viewable by everyone" ON public.project_open_roles FOR SELECT USING (true);
CREATE POLICY "Creators manage open roles" ON public.project_open_roles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_open_roles.project_id AND creator_id = auth.uid())
);

-- Tasks, Files, Chat, Presence (Members only)
CREATE POLICY "Project tasks visible to members" ON public.project_tasks FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid())
);
CREATE POLICY "Project tasks manageable by members" ON public.project_tasks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid())
);

CREATE POLICY "Project files visible to members" ON public.project_files FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_files.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_files.project_id AND pc.user_id = auth.uid())
);
CREATE POLICY "Project files manageable by members" ON public.project_files FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_files.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_files.project_id AND pc.user_id = auth.uid())
);

CREATE POLICY "Chat visible to members" ON public.project_chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_chat_messages.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_chat_messages.project_id AND pc.user_id = auth.uid())
);
CREATE POLICY "Members can send messages" ON public.project_chat_messages FOR INSERT WITH CHECK (
    (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_chat_messages.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_chat_messages.project_id AND pc.user_id = auth.uid()))
    AND sender_id = auth.uid()
);

CREATE POLICY "Presence visible to members" ON public.project_presence FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_presence.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_presence.project_id AND pc.user_id = auth.uid())
);
CREATE POLICY "Users manage own presence" ON public.project_presence FOR ALL USING (user_id = auth.uid());

-- Updates (Public read, Member write)
CREATE POLICY "Updates visible to everyone" ON public.project_updates FOR SELECT USING (true);
CREATE POLICY "Members can create updates" ON public.project_updates FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_updates.project_id AND p.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_updates.project_id AND pc.user_id = auth.uid())
);

CREATE POLICY "Update links visible to everyone" ON public.project_update_links FOR SELECT USING (true);
CREATE POLICY "Members can create update links" ON public.project_update_links FOR INSERT WITH CHECK (true);

-- Ideas (Public read, Owner write)
CREATE POLICY "Ideas visible to everyone" ON public.project_ideas FOR SELECT USING (true);
CREATE POLICY "Users can create ideas" ON public.project_ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ideas" ON public.project_ideas FOR UPDATE USING (auth.uid() = user_id);

-- 12. INDEXES
CREATE INDEX idx_projects_creator_id ON public.projects(creator_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX idx_project_chat_messages_project_id ON public.project_chat_messages(project_id);
CREATE INDEX idx_project_updates_project_id ON public.project_updates(project_id);
CREATE INDEX idx_project_ideas_user_id ON public.project_ideas(user_id);
