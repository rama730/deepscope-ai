import { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * @route GET /api/auth/passkeys
 * @description API endpoint to list all passkeys for the authenticated user
 * @requiresAuth true
 * @returns {Object} List of passkeys
 */

async function listPasskeys() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("passkey_credentials")
    .select("id, name, created_at, last_used_at, device_type, backed_up")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message || "Failed to load passkeys", 500);
  return successResponse({ passkeys: data || [] });
}

export const GET = createApiHandler(async (_req: NextRequest) => listPasskeys());


