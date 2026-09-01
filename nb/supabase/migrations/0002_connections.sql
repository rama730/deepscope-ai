-- ==============================================================================
-- MIGRATION 0002: CONNECTIONS (SOCIAL GRAPH)
-- ==============================================================================

-- 1. CONNECTIONS
CREATE TABLE public.connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    connected_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, connected_user_id)
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own connections" ON public.connections FOR SELECT USING (auth.uid() = user_id OR auth.uid() = connected_user_id);
CREATE POLICY "Users manage own connections" ON public.connections FOR ALL USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- 2. BLOCKS
CREATE TABLE public.blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own blocks" ON public.blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users manage own blocks" ON public.blocks FOR ALL USING (auth.uid() = blocker_id);

-- 3. MUTES
CREATE TABLE public.mutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    muter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    muted_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(muter_id, muted_id)
);

ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own mutes" ON public.mutes FOR SELECT USING (auth.uid() = muter_id);
CREATE POLICY "Users manage own mutes" ON public.mutes FOR ALL USING (auth.uid() = muter_id);
