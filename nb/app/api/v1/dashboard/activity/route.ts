import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

async function getActivity() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const supabase = createSupabaseServerClient();

    // Fetch recent items from different tables
    // In a real app with high volume, we'd use a dedicated 'activities' or 'audit_logs' table.
    // Here we'll just union specific tables manually.
    const [
        { data: projects },
        { data: skills },
        { data: experiences }
    ] = await Promise.all([
        supabase.from('featured_items').select('id, title, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('skills').select('id, skill_name, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('experiences').select('id, title, company, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const activity = [
        ...(projects?.map(p => ({ type: 'project', title: p.title, date: p.created_at })) || []),
        ...(skills?.map(s => ({ type: 'skill', title: s.skill_name, date: s.created_at })) || []),
        ...(experiences?.map(e => ({ type: 'experience', title: `${e.title} at ${e.company}`, date: e.created_at })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10); // Top 10 recent

    return successResponse({ activity });
}

export const GET = createApiHandler(getActivity);
