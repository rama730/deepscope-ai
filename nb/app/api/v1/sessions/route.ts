
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

async function getSessions() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    
    // Create client with user context by passing cookies or using the helper which does it? 
    // createSupabaseServerClient() handles cookies, but for RPC to see auth.uid(), we need an authenticated client.
    // The default createSupabaseServerClient should be sufficient if the user has a session cookie.
    const supabase = createSupabaseServerClient();

    const { data: sessions, error } = await supabase
        .rpc('get_my_sessions');

    if (error) return errorResponse("Failed to fetch sessions", 500, error.message);

    // Get current session ID to flag "This Device"
    const { data: { session } } = await supabase.auth.getSession();
    
    let currentSessionId: string | null = null;
    if (session?.access_token) {
        try {
            const parts = session.access_token.split('.');
            if (parts.length > 1 && parts[1]) {
                const payload = JSON.parse(atob(parts[1]));
                currentSessionId = payload.session_id;
            }
        } catch (e) {}
    }

    // Map RPC result to expected frontend interface
    const mappedSessions = sessions?.map((s: any) => ({
        id: s.id,
        device_info: { userAgent: s.user_agent },
        ip_address: s.ip,
        last_active: s.last_seen,
        is_current: s.id === currentSessionId
    })) || [];

    return successResponse({ sessions: mappedSessions });
}

export const GET = createApiHandler(getSessions);
