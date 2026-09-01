import { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * @route POST /api/auth/passkeys/authenticate/options
 * @description API endpoint to generate authentication options for passkey login
 * @requiresAuth true
 * @returns {Object} Authentication options for WebAuthn
 */

function getRpIdFromRequest(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  return host.split(":")[0];
}

async function handler(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const supabase = createSupabaseServerClient();
  const { data: creds, error } = await supabase
    .from("passkey_credentials")
    .select("credential_id")
    .eq("user_id", user.id);
  if (error) return errorResponse(error.message || "Failed to load passkeys", 500);

  if (!creds || creds.length === 0) {
    return errorResponse("No passkeys found. Create one first.", 400);
  }

  const rpID = getRpIdFromRequest(request) || "localhost";

  const options = await generateAuthenticationOptions({
    rpID,
    timeout: 60000,
    userVerification: "required",
    allowCredentials: creds.map((c) => ({
      id: c.credential_id,
      type: "public-key" as const,
    })),
  });

  const cookieStore = await cookies();
  cookieStore.set("passkey_auth_challenge", options.challenge, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  return successResponse({ options });
}

export const POST = createApiHandler(handler);


