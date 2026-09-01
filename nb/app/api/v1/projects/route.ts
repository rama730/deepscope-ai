import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse, validationErrorResponse, unauthorizedResponse } from "@/lib/api/response";
import { createProjectSchema, projectQuerySchema } from "@/lib/validations/project";
import { generateSlug, generateProjectId } from "@/lib/utils/project-ids";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const json = await request.json();
    const result = createProjectSchema.safeParse(json);

    if (!result.success) {
      return validationErrorResponse(
        result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      );
    }

    const { 
        title, description, short_description, problem_statement, solution_overview,
        status, visibility, tags, technologies_used, 
        project_type, custom_project_type, lifecycle_stages,
        terms_and_conditions, metadata, slug: providedSlug, project_id: providedProjectId 
    } = result.data;

    // Generate or validate slug and project_id with server-side uniqueness check
    let finalSlug = providedSlug;
    let finalProjectId = providedProjectId;

    // If slug not provided or if we need to ensure uniqueness, generate it
    if (!finalSlug) {
      finalSlug = generateSlug(title);
    }

    // If project_id not provided, generate it
    if (!finalProjectId) {
      finalProjectId = generateProjectId(title);
    }

// Server-side uniqueness check with retry logic
    let attempts = 0;
    const maxAttempts = 5;
    let project: any = null;
    let createError: any = null;

    while (attempts < maxAttempts) {
      // Check if current candidates exist specifically (efficient index lookup)
      const [slugCheck, idCheck] = await Promise.all([
        supabase.from("projects").select("id").eq("slug", finalSlug).maybeSingle(),
        supabase.from("projects").select("id").eq("project_id", finalProjectId).maybeSingle(),
      ]);

      const slugExists = !!slugCheck.data;
      const idExists = !!idCheck.data;

      if (slugExists || idExists) {
          attempts++;
          // Collision detected: Modify and retry
          const timestamp = Date.now().toString().slice(-4);
          if (slugExists) finalSlug = `${finalSlug}-${timestamp}`;
          if (idExists) finalProjectId = `${finalProjectId}-${timestamp}`;
          continue;
      }

      // If we are here, we believe they are unique. Proceed to insert.

      // Attempt to create project
      const { data: projectData, error: error } = await supabase
        .from('projects')
        .insert({
          creator_id: user.id,
          title,
          description,
          short_description, 
          problem_statement, 
          solution_overview,
          status,
          visibility,
          tags,
          technologies_used,
          project_type,
          custom_project_type,
          lifecycle_stages,
          terms_and_conditions,
          metadata,
          slug: finalSlug, 
          project_id: finalProjectId,
          is_deleted: false,
        })
        .select()
        .single();

      if (!error) {
        project = projectData;
        createError = null;
        break;
      }

      // If it's a duplicate slug error, regenerate and retry
      if (error.code === '23505' && (error.message.includes('slug') || error.message.includes('idx_projects_slug'))) {
        attempts++;
        // Add timestamp to make it unique
        const timestamp = Date.now().toString().slice(-6);
        finalSlug = `${finalSlug}-${timestamp}`;
        continue;
      }

      // For other errors, break and return error
      createError = error;
      break;
    }

    if (createError || !project) {
      // Log detailed error information
      const errorDetails = {
        message: createError?.message,
        code: createError?.code,
        details: createError?.details,
        hint: createError?.hint,
        attempts,
        projectData: {
          title,
          project_type,
          slug: finalSlug,
          project_id: finalProjectId,
        }
      };
      console.error("Create Project Error - Full details:", JSON.stringify(errorDetails, null, 2));
      return errorResponse(
        `Failed to create project: ${createError?.message || "Unknown error"}. Please try again.`,
        500,
        createError?.code
      );
    }

    // Auto-add creator as owner/admin relative
    const { error: collabError } = await supabase
        .from('project_collaborators')
        .insert({
            project_id: project.id,
            user_id: user.id,
            role: 'owner'
        });
        
    if (collabError) {
        // Log but don't fail the request, strictly speaking project is created
        console.error("Failed to add owner collaborator:", collabError);
    }

    return successResponse(project, 201);

  } catch (error) {
    // Log detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    };
    console.error("Internal Error (POST) - Full details:", JSON.stringify(errorDetails, null, 2));
    return errorResponse(
      `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      500
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const { data: { user } } = await supabase.auth.getUser();

    // Parse Search Params
    const queryParams: any = {};
    for (const [key, value] of searchParams.entries()) {
        queryParams[key] = value;
    }
    
    // Manual integer conversion for validation
    if (queryParams.page) queryParams.page = parseInt(queryParams.page);
    if (queryParams.limit) queryParams.limit = parseInt(queryParams.limit);

    const validation = projectQuerySchema.safeParse(queryParams);

    if (!validation.success) {
        // Fallback to defaults if validation fails? Or error? 
        // Usually list endpoints extend leniency.
        // Let's just use defaults for critical ones.
    }
    
    // Safely used parsed or defaults
    const { page, limit, status, type, sort, userId, scope } = validation.success ? validation.data : {
        page: 1, limit: 20, status: undefined, type: undefined, sort: 'newest', userId: undefined, scope: 'me'
    };
    
    // Auth Check
    if (!user) return unauthorizedResponse();

    const targetUserId = userId || user.id;

    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' });

    if (scope === 'me') {
        query = query.eq('creator_id', targetUserId);
    }

    if (status && status !== 'all') query = query.eq('status', status);
    if (type && type !== 'all') query = query.eq('project_type', type);

    // Sorting
    if (sort === 'popular') query = query.order('view_count', { ascending: false });
    else if (sort === 'oldest') query = query.order('created_at', { ascending: true });
    else query = query.order('created_at', { ascending: false }); // Newest

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error("Fetch Projects Error:", error);
        return errorResponse("Failed to fetch projects", 500, error.code);
    }

    return successResponse(data, 200, {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: (count || 0) > to + 1,
        hasPrev: page > 1
    });

  } catch (error) {
    // Log detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    };
    console.error("Internal Error (GET) - Full details:", JSON.stringify(errorDetails, null, 2));
    return errorResponse(
      `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      500
    );
  }
}
