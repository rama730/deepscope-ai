import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { createApiHandler } from "@/lib/api/handler";
import { successResponse } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * @route POST /api/auth/passkeys/login/options
 * @description API endpoint to generate authentication options for passkey-first login (no authentication required)
 * @requiresAuth false
 * @returns {Object} Authentication options for WebAuthn passkey login
 */

function getRpIdFromRequest(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  return host.split(":")[0];
}

async function handler(request: NextRequest) {
  const rpID = getRpIdFromRequest(request);

  const options = await generateAuthenticationOptions({
    timeout: 60000,
    rpID: rpID || "localhost",
    // Passkey-first login: use discoverable credentials when available
    // (do not restrict allowCredentials).
    userVerification: "required",
  });

  const cookieStore = await cookies();
  cookieStore.set("passkey_login_challenge", options.challenge, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  return successResponse({ options });
}

export const POST = createApiHandler(handler);


