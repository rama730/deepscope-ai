"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createProjectSchema } from "@/lib/validations/project";
import { generateSlug, generateProjectId } from "@/lib/utils/project-ids";
import { revalidatePath } from "next/cache";

export type CreateProjectResult = 
  | { success: true; project: any }
  | { success: false; error: string; code?: string };

export async function createProjectAction(formData: any): Promise<CreateProjectResult> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate Input
    const result = createProjectSchema.safeParse(formData);

    if (!result.success) {
      const errorMsg = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(", ");
      return { success: false, error: errorMsg };
    }

    const { 
        title, description, short_description, problem_statement, solution_overview,
        status, visibility, tags, technologies_used, 
        project_type, custom_project_type, lifecycle_stages,
        terms_and_conditions, metadata, slug: providedSlug, project_id: providedProjectId 
    } = result.data;

    // Generate or validate slug/id locally first
    let finalSlug = providedSlug || generateSlug(title);
    let finalProjectId = providedProjectId || generateProjectId(title);

    // Uniqueness Check Logic (Optimized Loop)
    let attempts = 0;
    const maxAttempts = 5;
    let project: any = null;
    let createError: any = null;

    while (attempts < maxAttempts) {
      // Check for existence efficiently
      const [slugCheck, idCheck] = await Promise.all([
        supabase.from("projects").select("id").eq("slug", finalSlug).maybeSingle(),
        supabase.from("projects").select("id").eq("project_id", finalProjectId).maybeSingle(),
      ]);

      const slugExists = !!slugCheck.data;
      const idExists = !!idCheck.data;

      if (slugExists || idExists) {
          attempts++;
          const timestamp = Date.now().toString().slice(-4);
          if (slugExists) finalSlug = `${finalSlug}-${timestamp}`;
          if (idExists) finalProjectId = `${finalProjectId}-${timestamp}`;
          continue;
      }

      // Insert
      const { data: projectData, error: insertError } = await supabase
        .from('projects')
        .insert({
          creator_id: user.id,
          title, description, short_description, problem_statement, solution_overview,
          status, visibility, tags, technologies_used,
          project_type, custom_project_type, lifecycle_stages,
          terms_and_conditions, metadata,
          slug: finalSlug, 
          project_id: finalProjectId,
          is_deleted: false,
        })
        .select()
        .single();

      if (!insertError) {
        project = projectData;
        break;
      }

      // Handle Race Condition (Duplicate Key)
      if (insertError.code === '23505') { // unique_violation
        attempts++;
        const timestamp = Date.now().toString().slice(-6);
        finalSlug = `${finalSlug}-${timestamp}`;
        continue;
      }

      createError = insertError;
      break;
    }

    if (createError || !project) {
        console.error("Create Project Action Error:", createError);
        return { 
            success: false, 
            error: createError?.message || "Failed to create project", 
            code: createError?.code 
        };
    }

    // Add Collaborator (Owner)
    await supabase.from('project_collaborators').insert({
        project_id: project.id,
        user_id: user.id,
        role: 'owner'
    });

    // Revalidate paths
    revalidatePath('/projects');
    revalidatePath('/dashboard');

    return { success: true, project };

  } catch (error: any) {
    console.error("Internal Server Action Error:", error);
    return { success: false, error: error.message || "Internal server error" };
  }
}
