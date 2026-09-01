-- Migration 0041: Seed Data for UniCamp Project
-- Populates missing fields and adds open roles for demonstration

-- 1. Update Project Details
UPDATE public.projects 
SET 
    problem_statement = 'Students lack a centralized platform to collaborate on projects, find peers with complementary skills, and showcase their work beyond traditional resumes.',
    solution_overview = 'UniCamp provides a comprehensive ecosystem for students to build teams, manage projects with industry-standard tools, and create a dynamic portfolio that demonstrates their real-world capabilities.'
WHERE title LIKE 'UniCamp%';

-- 2. Add Open Roles (if they don''t exist)
INSERT INTO public.project_open_roles (project_id, role, count, skills)
SELECT id, 'Frontend Developer', 2, ARRAY['React', 'TypeScript', 'Tailwind']
FROM public.projects 
WHERE title LIKE 'UniCamp%'
AND NOT EXISTS (
    SELECT 1 FROM public.project_open_roles WHERE project_id = projects.id AND role = 'Frontend Developer'
);

INSERT INTO public.project_open_roles (project_id, role, count, skills)
SELECT id, 'UX Designer', 1, ARRAY['Figma', 'User Research']
FROM public.projects 
WHERE title LIKE 'UniCamp%'
AND NOT EXISTS (
    SELECT 1 FROM public.project_open_roles WHERE project_id = projects.id AND role = 'UX Designer'
);

INSERT INTO public.project_open_roles (project_id, role, count, skills)
SELECT id, 'Backend Engineer', 1, ARRAY['Node.js', 'Supabase', 'PostgreSQL']
FROM public.projects 
WHERE title LIKE 'UniCamp%'
AND NOT EXISTS (
    SELECT 1 FROM public.project_open_roles WHERE project_id = projects.id AND role = 'Backend Engineer'
);
