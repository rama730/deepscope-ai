import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

async function exportData() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const supabase = createSupabaseServerClient();

    // Fetch all related data
    const [
        { data: profile },
        { data: skills },
        { data: experiences },
        { data: education },
        { data: projects }
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('skills').select('*').eq('user_id', user.id),
        supabase.from('experiences').select('*').eq('user_id', user.id),
        supabase.from('education').select('*').eq('user_id', user.id),
        supabase.from('featured_items').select('*').eq('user_id', user.id)
    ]);

    const exportBundle = {
        exportedAt: new Date().toISOString(),
        user: {
            id: user.id,
            email: user.email,
            ...profile
        },
        skills: skills || [],
        experiences: experiences || [],
        education: education || [],
        projects: projects || []
    };

    return successResponse(exportBundle);
}

export const POST = createApiHandler(exportData);
