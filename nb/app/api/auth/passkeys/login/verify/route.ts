import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createApiHandler } from "@/lib/api/handler";
import { errorResponse } from "@/lib/api/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * @route POST /api/auth/passkeys/login/verify
 * @description API endpoint to verify passkey authentication and log in user (no prior authentication required)
 * @requiresAuth false
 * @requestBody WebAuthn authentication response
 * @returns {Object} Login result with session information
 */

function getRpIdFromRequest(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  return host.split(":")[0];
}

function getExpectedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host = request.headers.get("host") || "localhost:3000";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${proto}://${host}`;
}

async function handler(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.id) return errorResponse("Invalid passkey response", 400);

  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get("passkey_login_challenge")?.value;
  if (!expectedChallenge) return errorResponse("Login expired. Please try again.", 400);

  const rpID = getRpIdFromRequest(request);
  const expectedOrigin = getExpectedOrigin(request);

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Server is missing SUPABASE_SERVICE_ROLE_KEY for passkey login", 500);
  }

  // Use service role to lookup passkey by credential id (bypass RLS for login)
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: stored, error: lookupErr } = await admin
    .from("passkey_credentials")
    .select("id, user_id, credential_id, public_key, counter")
    .eq("credential_id", body.id)
    .single();

  if (lookupErr || !stored) {
    console.error("Passkey lookup failed:", lookupErr);
    
    // DEBUG: Probe the DB to see why lookup failed
    const { count } = await admin.from("passkey_credentials").select("*", { count: "exact", head: true });
    const { data: sample } = await admin.from("passkey_credentials").select("credential_id").limit(1);
    
    const sampleId = sample && sample.length > 0 ? sample[0]?.credential_id : "empty";
    const receivedId = body.id ? body.id : "undefined";
    const debugMsg = `Debug: Table Count=${count}. Recv=${receivedId.substring(0,15)}... First=${sampleId.substring(0,15)}...`;
    
    return errorResponse(`Passkey not found. ${debugMsg}`, 404);
  }

  const verification = await verifyAuthenticationResponse({
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

  if (!verification.verified) {
    return errorResponse("Passkey verification failed", 400);
  }

  const nextCounter = verification.authenticationInfo?.newCounter;
  await admin
    .from("passkey_credentials")
    .update({
      counter: typeof nextCounter === "number" ? nextCounter : stored.counter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", stored.id);

  // Mint a Supabase session without password:
  // Use service role to generate a magiclink token_hash for that user, then verifyOtp (anon) to set cookies.
  // (Admin client already created above)

  // Fetch email for generateLink
  const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(stored.user_id);
  if (userErr || !userRes?.user?.email) {
    console.error("User lookup error:", userErr);
    return errorResponse(`[Step: User Lookup] ${userErr?.message || "Unable to fetch user"}`, 500);
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userRes.user.email,
    options: { redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error("Link generation error:", linkErr);
    return errorResponse(`[Step: Link Gen] ${linkErr?.message || "Failed to create login session"}`, 500);
  }

  // Verify the token_hash using a server client that writes auth cookies onto the response
  const response = NextResponse.json({ success: true, data: { signedIn: true } });
  const supabaseForCookies = createSupabaseServerClient(request, response);
  const { error: verifyErr } = await supabaseForCookies.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyErr) {
    console.error("Verify OTP error:", verifyErr);
    return errorResponse(`[Step: Verify OTP] ${verifyErr.message || "Failed to complete login session"}`, 500);
  }

  cookieStore.delete("passkey_login_challenge");

  return response;
}

export const POST = createApiHandler(handler);


