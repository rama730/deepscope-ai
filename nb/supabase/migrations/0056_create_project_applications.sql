-- Migration 0056: Create project_applications table for project application management
-- This table stores applications to join projects

-- Create project_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_applied_for TEXT NOT NULL,
    message TEXT NOT NULL,
    work_timings TEXT, -- Optional: e.g., "20 hours/week", "Full-time", etc.
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, withdrawn
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate pending applications
-- Note: We allow multiple applications with different statuses (e.g., one rejected, one pending)
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_applications_unique_pending 
ON public.project_applications(project_id, applicant_id) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_applications_project_id ON public.project_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_applicant_id ON public.project_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_status ON public.project_applications(status);
CREATE INDEX IF NOT EXISTS idx_project_applications_created_at ON public.project_applications(created_at DESC);

-- RLS Policies
-- Applicants and project creators can read applications
CREATE POLICY "Applicants and creators read applications" 
ON public.project_applications 
FOR SELECT 
USING (
    auth.uid() = applicant_id 
    OR 
    EXISTS(
        SELECT 1 
        FROM public.projects p 
        WHERE p.id = project_applications.project_id 
        AND p.creator_id = auth.uid()
    )
);

-- Users can create their own applications
CREATE POLICY "Users create own applications" 
ON public.project_applications 
FOR INSERT 
WITH CHECK (auth.uid() = applicant_id);

-- Project creators can update applications (accept/reject)
CREATE POLICY "Creators update applications" 
ON public.project_applications 
FOR UPDATE 
USING (
    EXISTS(
        SELECT 1 
        FROM public.projects p 
        WHERE p.id = project_applications.project_id 
        AND p.creator_id = auth.uid()
    )
);

-- Applicants can update their own applications (withdraw)
CREATE POLICY "Applicants update own applications" 
ON public.project_applications 
FOR UPDATE 
USING (auth.uid() = applicant_id)
WITH CHECK (
    auth.uid() = applicant_id
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_applications_updated_at
    BEFORE UPDATE ON public.project_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_project_applications_updated_at();
