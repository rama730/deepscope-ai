-- ==============================================================================
-- MIGRATION 0098: INTEREST GRAPH (TOOLS + TECHNIQUES)
-- Adds user_tools and user_techniques tables with RLS similar to public.skills
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) USER TOOLS
CREATE TABLE IF NOT EXISTS public.user_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  proficiency_level TEXT, -- Beginner, Intermediate, Advanced, Expert
  intent TEXT, -- 'skilled' | 'learn'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_tools ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_tools' AND policyname='Public user tools'
  ) THEN
    CREATE POLICY "Public user tools" ON public.user_tools
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_tools' AND policyname='Users manage own tools'
  ) THEN
    CREATE POLICY "Users manage own tools" ON public.user_tools
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_tools_intent_check'
  ) THEN
    ALTER TABLE public.user_tools
      ADD CONSTRAINT user_tools_intent_check
      CHECK (intent IS NULL OR intent IN ('skilled', 'learn'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_tools_user_id ON public.user_tools(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tools_name_lower ON public.user_tools(LOWER(tool_name));

-- 2) USER TECHNIQUES
CREATE TABLE IF NOT EXISTS public.user_techniques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technique_name TEXT NOT NULL,
  proficiency_level TEXT, -- Beginner, Intermediate, Advanced, Expert
  intent TEXT, -- 'skilled' | 'learn'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_techniques ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_techniques' AND policyname='Public user techniques'
  ) THEN
    CREATE POLICY "Public user techniques" ON public.user_techniques
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_techniques' AND policyname='Users manage own techniques'
  ) THEN
    CREATE POLICY "Users manage own techniques" ON public.user_techniques
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_techniques_intent_check'
  ) THEN
    ALTER TABLE public.user_techniques
      ADD CONSTRAINT user_techniques_intent_check
      CHECK (intent IS NULL OR intent IN ('skilled', 'learn'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_techniques_user_id ON public.user_techniques(user_id);
CREATE INDEX IF NOT EXISTS idx_user_techniques_name_lower ON public.user_techniques(LOWER(technique_name));


