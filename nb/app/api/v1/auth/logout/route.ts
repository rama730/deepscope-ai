import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export const dynamic = 'force-dynamic';

/**
 * @route POST /api/v1/auth/logout
 * @description API endpoint to log out the current user and destroy session
 * @requiresAuth true
 * @returns {Object} Logout confirmation
 */

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return errorResponse(error.message, 500, error.code);
    }

    return successResponse({ message: "Logged out successfully" });
  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}
