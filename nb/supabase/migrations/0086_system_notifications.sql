-- Migration 0086: System-Wide Notifications Triggers
-- Ensures notifications for all critical user events throughout the application

-- 1. Helper function for safe notification insertion
-- Validates that we don't notify the actor themselves
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT,
    p_actor_id UUID,
    p_related_entity_type TEXT,
    p_related_entity_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Don't notify if user is performing action on themselves (except strictly system notices)
    IF p_user_id IS NOT NULL AND (p_actor_id IS NULL OR p_user_id != p_actor_id) THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            link,
            actor_id,
            related_entity_type,
            related_entity_id
        ) VALUES (
            p_user_id,
            p_type,
            p_title,
            p_message,
            p_link,
            p_actor_id,
            p_related_entity_type,
            p_related_entity_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. PROJECT APPLICATIONS TRIGGERS
-- A. New Application (Notify Project Creator)
CREATE OR REPLACE FUNCTION public.handle_new_project_application()
RETURNS TRIGGER AS $$
DECLARE
    project_creator_id UUID;
    project_title TEXT;
    applicant_name TEXT;
BEGIN
    -- Get project details
    SELECT creator_id, title INTO project_creator_id, project_title
    FROM public.projects
    WHERE id = NEW.project_id;

    -- Get applicant details
    SELECT full_name INTO applicant_name
    FROM public.profiles
    WHERE id = NEW.applicant_id;

    -- Notify Creator
    PERFORM public.create_notification(
        project_creator_id,
        'application_received',
        'New Project Application',
        COALESCE(applicant_name, 'Someone') || ' applied to ' || COALESCE(project_title, 'your project'),
        '/projects/' || NEW.project_id || '?tab=applications',
        NEW.applicant_id,
        'application',
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_project_application ON public.project_applications;
CREATE TRIGGER on_new_project_application
    AFTER INSERT ON public.project_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_project_application();


-- B. Application Status Change (Notify Applicant)
CREATE OR REPLACE FUNCTION public.handle_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
    project_title TEXT;
BEGIN
    IF OLD.status != NEW.status THEN
        -- Get project title
        SELECT title INTO project_title
        FROM public.projects
        WHERE id = NEW.project_id;

        -- Notify Applicant
        PERFORM public.create_notification(
            NEW.applicant_id,
            'application_' || NEW.status, -- application_accepted, application_rejected
            'Application Update',
            'Your application for ' || COALESCE(project_title, 'a project') || ' was ' || NEW.status,
            '/projects/' || NEW.project_id,
            NULL, -- System notification, effectively
            'application',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_status_change ON public.project_applications;
CREATE TRIGGER on_application_status_change
    AFTER UPDATE ON public.project_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_application_status_change();


-- 3. PROJECT COLLABORATORS TRIGGER
-- Notify user when they are added to a project
CREATE OR REPLACE FUNCTION public.handle_new_collaborator()
RETURNS TRIGGER AS $$
DECLARE
    project_title TEXT;
    project_creator_id UUID;
BEGIN
    -- Get project details
    SELECT title, creator_id INTO project_title, project_creator_id
    FROM public.projects
    WHERE id = NEW.project_id;

    -- Notify the new collaborator
    PERFORM public.create_notification(
        NEW.user_id,
        'project_access_granted',
        'Project Access Granted',
        'You now have access to: ' || COALESCE(project_title, 'Unknown Project'),
        '/projects/' || NEW.project_id,
        project_creator_id,
        'project',
        NEW.project_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_collaborator ON public.project_collaborators;
CREATE TRIGGER on_new_collaborator
    AFTER INSERT ON public.project_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_collaborator();


-- 4. TASK ASSIGNMENT TRIGGER
-- Notify user when they are assigned a task
CREATE OR REPLACE FUNCTION public.handle_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    project_id UUID;
    task_title TEXT;
    assigner_id UUID;
    project_title TEXT;
BEGIN
    -- Only notify on NEW assignment or CHANGED assignment
    IF (OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL) OR 
       (OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NOT NULL AND OLD.assigned_to != NEW.assigned_to) THEN
       
        -- Get Assignee (We assume the current auth user is the assigner, trigger runs in their context)
        -- But for reliability we can check if there's a 'reporter_id' or just pass NULL for actor if unsure.
        -- Let's try to infer project title.
        SELECT title INTO project_title FROM public.projects WHERE id = NEW.project_id;

        PERFORM public.create_notification(
            NEW.assigned_to,
            'task_assigned',
            'Task Assigned',
            'You have been assigned to task: ' || NEW.title,
            '/projects/' || NEW.project_id || '?taskId=' || NEW.id,
            auth.uid(), -- The person making the change triggers this
            'task',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_assignment ON public.project_tasks;
CREATE TRIGGER on_task_assignment
    AFTER UPDATE ON public.project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_task_assignment();


-- 5. RECOMMENDATIONS TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_recommendation()
RETURNS TRIGGER AS $$
DECLARE
    author_name TEXT;
BEGIN
    SELECT full_name INTO author_name FROM public.profiles WHERE id = NEW.author_id;

    PERFORM public.create_notification(
        NEW.recipient_id,
        'recommendation_received',
        'New Recommendation',
        COALESCE(author_name, 'Someone') || ' wrote you a recommendation',
        '/profile/' || NEW.recipient_id, -- Should go to recommendations tab really
        NEW.author_id,
        'recommendation',
        NEW.id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_recommendation ON public.recommendations;
CREATE TRIGGER on_new_recommendation
    AFTER INSERT ON public.recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_recommendation();
