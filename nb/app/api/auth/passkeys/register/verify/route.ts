import { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * @route POST /api/auth/passkeys/register/verify
 * @description API endpoint to verify and complete passkey registration
 * @requiresAuth true
 * @requestBody WebAuthn registration response
 * @returns {Object} Passkey registration result
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
  const expectedChallenge = cookieStore.get("passkey_reg_challenge")?.value;
  const savedName = cookieStore.get("passkey_reg_name")?.value || null;
  if (!expectedChallenge) return errorResponse("Registration expired. Please try again.", 400);

  const rpID = getRpIdFromRequest(request);
  const expectedOrigin = request.headers.get("origin") || `${process.env.NODE_ENV === "production" ? "https" : "http"}://${request.headers.get("host")}`;

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return errorResponse("Passkey verification failed", 400);
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  
  if (!credential) {
    return errorResponse("Passkey registration failed (missing credential)", 400);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("passkey_credentials").insert({
    user_id: user.id,
    name: savedName,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64"),
    counter: credential.counter,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    transports: credential.transports || null,
  } as any);

  if (error) {
    return errorResponse(error.message || "Failed to save passkey", 500);
  }

  cookieStore.delete("passkey_reg_challenge");
  cookieStore.delete("passkey_reg_name");

  return successResponse({ saved: true });
}

export const POST = createApiHandler(handler);


