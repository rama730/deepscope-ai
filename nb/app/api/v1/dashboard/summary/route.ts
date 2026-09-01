import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

async function getSummary() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const supabase = createSupabaseServerClient();

    const { data: profile } = await supabase
        .from('profiles')
        .select('profile_strength, full_name, role')
        .eq('id', user.id)
        .single();

    if (!profile) return errorResponse("Profile not found", 404);

    return successResponse({
        profileStrength: profile.profile_strength || 0,
        userName: profile.full_name || user.email?.split('@')[0] || 'User',
        role: profile.role,
        message: "Welcome back! Here's what's happening today."
    });
}

export const GET = createApiHandler(getSummary);
