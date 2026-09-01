import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export const dynamic = 'force-dynamic';

/**
 * @route POST /api/v1/auth/refresh
 * @description API endpoint to refresh the authentication session
 * @requiresAuth false
 * @requestBody { refresh_token?: string } - Optional refresh token (can use cookies instead)
 * @returns {Object} Refreshed user session
 */

export async function POST(request: NextRequest) {
  try {
    // In Supabase SSR, refreshing is often handled via cookies automatically by the middleware/client.
    // However, for an explicit API endpoint, we can try to refresh the session if a refresh token is provided in body (for mobile apps)
    // or rely on the cookie if present.
    // For this explicit "Refresh" endpoint, let's assume we might receive a refresh_token in the body or just want to refresh the cookie session.
    
    // Simplest approach: Get current session (which triggers refresh if needed in supabase-js) or explicit refresh
    const supabase = createSupabaseServerClient();
    
    // If request body has refresh_token, use it
    let refreshToken: string | undefined;
    try {
      const json = await request.json();
      refreshToken = json.refresh_token; 
    } catch (e) {
      // Body might be empty if relying on cookies
    }

    let error, data;

    if (refreshToken) {
        const result = await supabase.auth.refreshSession({ refresh_token: refreshToken });
        data = result.data;
        error = result.error;
    } else {
        // Just getting the user/session will trigger a refresh if the cookie is near expiry
        const result = await supabase.auth.getSession();
        data = result.data;
        error = result.error;
    }

    if (error) {
      return errorResponse(error.message, 401, error.code);
    }

    if (!data.session) {
        return errorResponse("No active session", 401);
    }

    // Return a verified user object (avoid returning session.user directly)
    const { data: { user } } = await supabase.auth.getUser();

    return successResponse({
      user,
      session: data.session,
    });

  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}
