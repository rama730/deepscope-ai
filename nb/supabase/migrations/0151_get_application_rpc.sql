-- Migration 0151: Create RPC for fetching application details by conversation ID
-- This avoids complex client-side joins and potential ambiguous foreign key errors.

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
        pr.display_name as applicant_name,
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

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_application_for_chat(UUID) TO authenticated;
