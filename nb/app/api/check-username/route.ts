
import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

interface CheckUsernameRequest {
  username: string;
  excludeUserId?: string;
}

async function checkUsername(request: NextRequest) {
  const json = await request.json() as CheckUsernameRequest;
  const username = json.username?.trim().toLowerCase();

  if (!username) {
    return errorResponse("Username is required", 400);
  }

  if (username.length < 3) {
    return errorResponse("Username must be at least 3 characters", 400);
  }

  // Check reserved list if needed (optional)
  const reserved = ['admin', 'root', 'api', 'app', 'system'];
  if (reserved.includes(username)) {
      return successResponse({ isAvailable: false });
  }

  const supabase = createSupabaseServerClient();
  
  let query = supabase
    .from('profiles')
    .select('id')
    .ilike('username', username);

  if (json.excludeUserId) {
    query = query.neq('id', json.excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    return errorResponse(error.message, 500);
  }

  const isAvailable = !data || data.length === 0;

  return successResponse({ isAvailable });
}

export const POST = createApiHandler(checkUsername);
