-- COMPREHENSIVE REPAIR SCRIPT
-- Runs safely even if you have run parts of it before.

-- 1. Ensure conversation_id exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_applications' AND column_name = 'conversation_id'
    ) THEN
        ALTER TABLE public.project_applications 
        ADD COLUMN conversation_id UUID REFERENCES public.conversations(id);
    END IF;
END $$;

-- 2. Ensure portfolio_link exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_applications' AND column_name = 'portfolio_link'
    ) THEN
        ALTER TABLE public.project_applications 
        ADD COLUMN portfolio_link TEXT;
    END IF;
END $$;

-- 3. Ensure work_timings exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_applications' AND column_name = 'work_timings'
    ) THEN
        ALTER TABLE public.project_applications 
        ADD COLUMN work_timings TEXT;
    END IF;
END $$;

-- 4. Re-create the RPC (Safe to run multiple times)
CREATE OR REPLACE FUNCTION public.get_application_for_chat(p_conversation_id UUID)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    applicant_id UUID,
    role_applied_for TEXT,
    status TEXT,
    work_timings TEXT,
    portfolio_link TEXT,
    project_title TEXT,
    project_creator_id UUID,
    project_slug TEXT,
    applicant_name TEXT,
    applicant_username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.id,
        pa.project_id,
        pa.applicant_id,
        pa.role_applied_for,
        pa.status,
        pa.work_timings,
        pa.portfolio_link,
        p.title as project_title,
        p.creator_id as project_creator_id,
        p.slug as project_slug,
        pr.full_name as applicant_name,
        pr.username as applicant_username
    FROM 
        public.project_applications pa
    INNER JOIN 
        public.projects p ON pa.project_id = p.id
    INNER JOIN 
        public.profiles pr ON pa.applicant_id = pr.id
    WHERE 
        pa.conversation_id = p_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_application_for_chat(UUID) TO authenticated;
