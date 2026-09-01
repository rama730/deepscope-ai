import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface ProjectNotification {
    id: string;
    project_id: string;
    user_id: string;
    notification_type: 'task_update' | 'new_team_member' | 'task_mention' | 'project_update';
    title: string;
    message: string;
    metadata?: Record<string, any>;
    read: boolean;
    created_at: string;
}

export const ProjectNotificationService = {
    /**
     * Notify users about a task update.
     */
    async notifyTaskUpdate(
        taskId: string,
        updateType: 'created' | 'updated' | 'status_changed' | 'assigned' | 'completed',
        userId: string,
        projectId: string
    ): Promise<void> {
        const supabase = createSupabaseBrowserClient();
        
        // Get task details
        const { data: task } = await supabase
            .from('project_tasks')
            .select('title, status, assigned_to')
            .eq('id', taskId)
            .single();

        if (!task) return;

        // Get all project members (creator + collaborators)
        const { data: members } = await supabase
            .from('project_collaborators')
            .select('user_id')
            .eq('project_id', projectId);

        const memberIds = [
            // Get project creator
            ...(await supabase.from('projects').select('creator_id').eq('id', projectId).single()).data?.creator_id ? 
                [(await supabase.from('projects').select('creator_id').eq('id', projectId).single()).data?.creator_id] : [],
            // Get collaborators
            ...(members || []).map(m => m.user_id)
        ].filter(Boolean) as string[];

        // Create notifications for all members (except the user who made the update)
        const notifications = memberIds
            .filter(id => id !== userId)
            .map(memberId => ({
                user_id: memberId,
                notification_type: 'task_update' as const,
                title: `Task ${updateType === 'created' ? 'created' : 'updated'}`,
                message: `Task "${task.title}" was ${updateType.replace('_', ' ')}`,
                metadata: {
                    task_id: taskId,
                    project_id: projectId,
                    update_type: updateType
                },
                read: false
            }));

        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
        }
    },

    /**
     * Notify project members about a new team member.
     */
    async notifyNewTeamMember(
        projectId: string,
        newMemberId: string
    ): Promise<void> {
        const supabase = createSupabaseBrowserClient();
        
        // Get new member profile
        const { data: newMember } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', newMemberId)
            .single();

        if (!newMember) return;

        const newMemberName = newMember.full_name || newMember.username || 'Someone';

        // Get all project members
        const { data: members } = await supabase
            .from('project_collaborators')
            .select('user_id')
            .eq('project_id', projectId);

        const memberIds = [
            ...(await supabase.from('projects').select('creator_id').eq('id', projectId).single()).data?.creator_id ? 
                [(await supabase.from('projects').select('creator_id').eq('id', projectId).single()).data?.creator_id] : [],
            ...(members || []).map(m => m.user_id)
        ].filter(Boolean) as string[];

        // Create notifications for all members (except the new member)
        const notifications = memberIds
            .filter(id => id !== newMemberId)
            .map(memberId => ({
                user_id: memberId,
                notification_type: 'new_team_member' as const,
                title: 'New team member',
                message: `${newMemberName} joined the project`,
                metadata: {
                    project_id: projectId,
                    new_member_id: newMemberId
                },
                read: false
            }));

        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
        }
    },

    /**
     * Notify user when they are mentioned in a task.
     */
    async notifyTaskMention(
        messageId: string,
        taskId: string,
        mentionedUserId: string,
        projectId: string
    ): Promise<void> {
        const supabase = createSupabaseBrowserClient();
        
        // Get task details
        const { data: task } = await supabase
            .from('project_tasks')
            .select('title')
            .eq('id', taskId)
            .single();

        if (!task) return;

        // Get message sender
        const { data: message } = await supabase
            .from('messages')
            .select('sender_id, profiles:sender_id(full_name, username)')
            .eq('id', messageId)
            .single();

        const senderName = (message as any)?.profiles?.full_name || 
                          (message as any)?.profiles?.username || 
                          'Someone';

        // Create notification
        await supabase.from('notifications').insert({
            user_id: mentionedUserId,
            notification_type: 'task_mention',
            title: 'Mentioned in task',
            message: `${senderName} mentioned you in task "${task.title}"`,
            metadata: {
                message_id: messageId,
                task_id: taskId,
                project_id: projectId
            },
            read: false
        });
    }
};
