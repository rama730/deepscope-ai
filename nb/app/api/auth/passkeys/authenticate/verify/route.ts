import { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * @route POST /api/auth/passkeys/authenticate/verify
 * @description API endpoint to verify passkey authentication for logged-in user
 * @requiresAuth true
 * @requestBody WebAuthn authentication response
 * @returns {Object} Authentication verification result
 */

function getRpIdFromRequest(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  return host.split(":")[0];
}

async function handler(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await request.json();
  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get("passkey_auth_challenge")?.value;
  if (!expectedChallenge) return errorResponse("Verification expired. Please try again.", 400);

  const rpID = getRpIdFromRequest(request);
  const expectedOrigin = request.headers.get("origin") || `${process.env.NODE_ENV === "production" ? "https" : "http"}://${request.headers.get("host")}`;

  const credentialId = body?.id;
  if (!credentialId) return errorResponse("Invalid passkey response", 400);

  const supabase = createSupabaseServerClient();
  const { data: stored, error } = await supabase
    .from("passkey_credentials")
    .select("id, credential_id, public_key, counter")
    .eq("user_id", user.id)
    .eq("credential_id", credentialId)
    .single();
  if (error || !stored) return errorResponse("Passkey not found", 404);
  
  // Defensive check for stored object properties
  if (!stored.credential_id || !stored.public_key) {
      return errorResponse("Invalid passkey data stored", 500);
  }

  let verification;
  try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID as string | string[],
        credential: {
          id: stored.credential_id,
          publicKey: new Uint8Array(Buffer.from(stored.public_key, "base64")),
          counter: Number(stored.counter || 0),
        },
        requireUserVerification: true,
      });
  } catch (err: any) {
      console.error("Passkey verification error:", err);
      return errorResponse(err.message || "Internal verification error", 500);
  }

  if (!verification.verified) {
    return errorResponse("Passkey verification failed", 400);
  }

  // Update counter + last_used_at
  const nextCounter = verification.authenticationInfo?.newCounter;
  await supabase
    .from("passkey_credentials")
    .update({
      counter: typeof nextCounter === "number" ? nextCounter : stored.counter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", stored.id)
    .eq("user_id", user.id);

  cookieStore.delete("passkey_auth_challenge");

  return successResponse({ verified: true });
}

export const POST = createApiHandler(handler);


