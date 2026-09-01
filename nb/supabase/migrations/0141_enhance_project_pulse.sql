-- Create a comprehensive view for project activity
-- This unifies tasks, files, members, existing activity, and project updates into a single feed

CREATE OR REPLACE VIEW project_activity_feed AS
SELECT
    -- Unique ID for the feed item (prefixed to avoid collisions)
    'task_completed_' || t.id as id,
    t.project_id,
    'task_completed' as type,
    'completed "' || t.title || '"' as description,
    t.assigned_to as actor_id,
    COALESCE(t.updated_at, t.created_at) as created_at,
    jsonb_build_object(
        'task_id', t.id,
        'title', t.title,
        'status', t.status,
        'priority', t.priority
    ) as metadata,
    jsonb_build_object(
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url
    ) as actor
FROM project_tasks t
LEFT JOIN profiles p ON t.assigned_to = p.id
WHERE t.status = 'done'

UNION ALL

SELECT
    'task_created_' || t.id as id,
    t.project_id,
    'task_created' as type,
    'created task "' || t.title || '"' as description,
    t.created_by as actor_id,
    t.created_at,
    jsonb_build_object(
        'task_id', t.id,
        'title', t.title,
        'status', t.status,
        'priority', t.priority
    ) as metadata,
    jsonb_build_object(
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url
    ) as actor
FROM project_tasks t
LEFT JOIN profiles p ON t.created_by = p.id
WHERE t.status != 'done'

UNION ALL

SELECT
    'file_' || f.id as id,
    f.project_id,
    'file_uploaded' as type,
    'uploaded "' || COALESCE(f.name, 'a file') || '"' as description,
    f.uploaded_by as actor_id,
    f.created_at,
    jsonb_build_object(
        'file_id', f.id,
        'file_name', f.name,
        'file_type', f.file_type,
        'size', f.file_size
    ) as metadata,
    jsonb_build_object(
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url
    ) as actor
FROM project_files f
LEFT JOIN profiles p ON f.uploaded_by = p.id

UNION ALL

SELECT
    'member_' || pm.user_id as id,
    pm.project_id,
    'member_joined' as type,
    'joined as ' || COALESCE(pm.role, 'team member') as description,
    pm.user_id as actor_id,
    COALESCE(pm.joined_at, now()) as created_at,
    jsonb_build_object(
        'role', pm.role,
        'user_id', pm.user_id
    ) as metadata,
    jsonb_build_object(
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url
    ) as actor
FROM project_collaborators pm
LEFT JOIN profiles p ON pm.user_id = p.id

UNION ALL

SELECT
    'update_' || pu.id as id,
    pu.project_id,
    'project_updated' as type,
    'posted an update' || CASE WHEN pu.title IS NOT NULL THEN ': "' || pu.title || '"' ELSE '' END as description,
    pu.created_by as actor_id,
    pu.created_at,
    jsonb_build_object(
        'kind', 'project_update',
        'update_id', pu.id,
        'title', pu.title,
        'content', pu.content
    ) as metadata,
    jsonb_build_object(
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url
    ) as actor
FROM project_updates pu
LEFT JOIN profiles p ON pu.created_by = p.id

UNION ALL

-- Include existing manual activity log entries
SELECT
    'event_' || pa.id as id,
    pa.project_id,
    pa.event_type as type,
    pa.description,
    pa.actor_id,
    pa.created_at,
    pa.metadata,
    jsonb_build_object(
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url
    ) as actor
FROM project_activity_events pa
LEFT JOIN profiles p ON pa.actor_id = p.id;

-- Grant permissions (adjust based on your security model)
GRANT SELECT ON project_activity_feed TO authenticated;
GRANT SELECT ON project_activity_feed TO service_role;
