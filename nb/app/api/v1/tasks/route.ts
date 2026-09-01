import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse, validationErrorResponse, unauthorizedResponse } from "@/lib/api/response";
import { createTaskSchema } from "@/lib/validations/task";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const json = await request.json();
    const result = createTaskSchema.safeParse(json);

    if (!result.success) {
      return validationErrorResponse(
        result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      );
    }

    const { 
        project_id, sprint_id, title, description, status, priority, tags, 
        assigned_to, due_date, metadata,
        subtasks, label_ids, watcher_ids, type,
        story_points
    } = result.data;

    // Create Task
    const { data: task, error: createError } = await supabase
      .from('project_tasks')
      .insert({
        project_id,
        sprint_id: sprint_id || null,
        created_by: user.id,
        title,
        description,
        status,
        priority,
        task_type: type, // Map 'type' from schema to 'task_type' in DB (check if schema matches DB column name or map it)
        story_points: story_points ?? null,
        tags,
        assigned_to,
        due_date,
        metadata,
        is_deleted: false
      })
      .select()
      .single();

    if (createError) {
      console.error("Create Task Error:", createError);
      return errorResponse(createError.message || "Failed to create task", 400, createError.code);
    }

    const warnings: Array<{ area: string; message: string; code?: string }> = [];
    
    // Handle Subtasks
    if (subtasks && subtasks.length > 0) {
        const { error: subError } = await supabase.from("task_subtasks").insert(
            subtasks.map(s => ({
                task_id: task.id,
                title: s.title,
                completed: false
            }))
        );
        if (subError) {
            console.error("Failed to insert subtasks:", subError);
            warnings.push({ area: "subtasks", message: subError.message, code: subError.code });
        }
    }
    
    // Handle Labels
    if (label_ids && label_ids.length > 0) {
        const { error: labelError } = await supabase.from("task_label_assignments").insert(
            label_ids.map(lid => ({
                task_id: task.id,
                label_id: lid
            }))
        );
        if (labelError) {
            console.error("Failed to insert labels:", labelError);
            warnings.push({ area: "labels", message: labelError.message, code: labelError.code });
        }
    }

    // Handle Watchers
    if (watcher_ids && watcher_ids.length > 0) {
        const { error: watcherError } = await supabase.from("task_watchers").insert(
            watcher_ids.map(wid => ({
                task_id: task.id,
                user_id: wid
            }))
        );
        if (watcherError) {
            console.error("Failed to insert watchers:", watcherError);
            warnings.push({ area: "watchers", message: watcherError.message, code: watcherError.code });
        }
    }

    // ------------------------------------------------------------------
    // EMAIL NOTIFICATION: Task Assignment
    // ------------------------------------------------------------------
    if (assigned_to && assigned_to !== user.id) {
        // We run this asynchronously to not block the response
        (async () => {
            try {
                const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
                const { emailService } = await import('@/lib/email/service');
                const { default: TaskAssignmentEmail } = await import('@/components/emails/TaskAssignmentEmail');

                const admin = createSupabaseAdmin();
                
                // 1. Get Assignee Email (Admin Only)
                const { data: { user: assignee }, error: userError } = await admin.auth.admin.getUserById(assigned_to);
                
                if (userError || !assignee || !assignee.email) {
                    console.warn(`[Email] Could not find email for user ${assigned_to}`);
                    return;
                }

                // 2. Get Assignee Name (Public Profile)
                const { data: profile } = await supabase.from('profiles').select('full_name, username').eq('id', assigned_to).single();
                const assigneeName = profile?.full_name || profile?.username || "Collaborator";

                // 3. Get Project Title
                const { data: project } = await supabase.from('projects').select('title').eq('id', project_id).single();
                const projectTitle = project?.title || "Project";

                // 4. Send Email
                await emailService.send({
                    to: assignee.email,
                    subject: `New Task Assignment: ${title}`,
                    react: TaskAssignmentEmail({
                        assigneeName,
                        taskTitle: title,
                        projectName: projectTitle,
                        assignerName: user.user_metadata?.full_name || "A team member",
                        taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project_id}?tab=tasks&taskId=${task.id}`
                    })
                });
                
            } catch (emailErr) {
                console.error("[Email] Failed to send task assignment email:", emailErr);
            }
        })();
    }

    return successResponse(task, 201, warnings.length ? { warnings } : undefined);

  } catch (error) {
    console.error("Internal Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
