import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

async function getStats() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const supabase = createSupabaseServerClient();

    // Parallelize queries for better performance
    const [
        { count: skillsCount },
        { count: projectsCount }, // featured_items
        { count: experienceCount },
        { count: educationCount }
    ] = await Promise.all([
        supabase.from('skills').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('featured_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('experiences').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('education').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    ]);

    // Active Items (e.g. current jobs + projects)
    const { count: currentJobsCount } = await supabase
        .from('experiences')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('current', true);

    return successResponse({
        totalItems: (skillsCount || 0) + (projectsCount || 0) + (experienceCount || 0) + (educationCount || 0),
        activeItems: (currentJobsCount || 0) + (projectsCount || 0), // Assuming all featured items are "active" for now
        projectsCount: projectsCount || 0,
        skillsCount: skillsCount || 0
    });
}

export const GET = createApiHandler(getStats);
