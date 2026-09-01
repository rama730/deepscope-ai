import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

async function deleteAllSessions() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const supabase = createSupabaseServerClient();

    // In a real app, we should probably keep the "current" session alive.
    // But determining "Current" from just the API request token might be tricky if we don't strictly match the hash.
    // For now, we'll implement "Delete All" (Logout Everywhere). 
    // To implement "Delete All Others", we'd need to identify the current session ID in the request, which depends on how we stored it (access token hash).
    
    // We'll attempt "Delete All user sessions"
    const { error } = await supabase
        .rpc('revoke_all_my_sessions');

    if (error) return errorResponse("Failed to revoke sessions", 500, error.message);

    return successResponse({ message: "All sessions revoked" });
}

export const DELETE = createApiHandler(deleteAllSessions);
