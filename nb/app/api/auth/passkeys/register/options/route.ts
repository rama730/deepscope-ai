import { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse } from "@/lib/api/response";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * @route POST /api/auth/passkeys/register/options
 * @description API endpoint to generate registration options for passkey creation
 * @requiresAuth true
 * @requestBody { name?: string } - Optional name for the passkey
 * @returns {Object} Registration options for WebAuthn
 */

function getRpIdFromRequest(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  return host.split(":")[0];
}

async function handler(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name : null;

  const rpID = getRpIdFromRequest(request) || "localhost";
  const rpName = "nb";

  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("passkey_credentials")
    .select("credential_id")
    .eq("user_id", user.id);

  const excludeCredentials = (existing || []).map((c) => ({
    id: c.credential_id,
    type: "public-key" as const,
  }));

  // @simplewebauthn/server no longer allows string userIDs.
  // Use a stable byte representation (UUID string encoded to bytes is <= 64 bytes).
  const userIdBytes = new TextEncoder().encode(user.id);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userIdBytes,
    userName: user.email || user.id,
    userDisplayName: (user.user_metadata as any)?.full_name || user.email || "User",
    timeout: 60000,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "required",
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("passkey_reg_challenge", options.challenge, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });
  if (name) {
    cookieStore.set("passkey_reg_name", name, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
    });
  }

  return successResponse({ options });
}

export const POST = createApiHandler(handler);


