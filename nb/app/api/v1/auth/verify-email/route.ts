import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createApiHandler } from "@/lib/api/handler";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const dynamic = 'force-dynamic';

/**
 * @route POST /api/v1/auth/verify-email
 * @description API endpoint to verify email address using a verification token
 * @requiresAuth false
 * @requestBody { token: string }
 * @returns {Object} Verification result
 */

async function verifyEmail(request: NextRequest) {
    const json = await request.json().catch(() => ({}));
    const { token } = json;

    if (!token) {
        return errorResponse("Token is required", 400);
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return errorResponse("Server configuration error", 500);

    const supabaseAdmin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Find profile with this token
    const { data: profiles, error: findError } = await supabaseAdmin
        .from('profiles')
        .select('id, verification_expires_at, email')
        .eq('verification_token', token)
        .limit(1);

    if (findError) return errorResponse(findError.message, 500);
    if (!profiles || profiles.length === 0) {
        return errorResponse("Invalid or used token", 400);
    }
    const profile = profiles[0];

    if (!profile) {
        return errorResponse("Invalid or used token", 400);
    }

    // 2. Check Expiration
    if (!profile.verification_expires_at) {
        return errorResponse("Invalid verification token", 400, "INVALID_TOKEN");
    }

    const expiresAt = new Date(profile.verification_expires_at);
    if (!isFinite(expiresAt.getTime()) || expiresAt < new Date()) {
        return errorResponse("Token has expired", 400, "TOKEN_EXPIRED");
    }

    // 3. Mark as Verified
    // We update 'email_verified' in profiles AND we should ideally update auth.users 'email_confirmed_at' 
    // but we can't easily update auth.users without specific admin API calls that might reset passwords or requiring flows.
    // For this Custom Flow, we trust our 'profiles.email_verified' flag.
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
            email_verified: true,
            verification_token: null, // Invalidate token
            verification_expires_at: null
        })
        .eq('id', profile.id);

    if (updateError) return errorResponse("Failed to verify email", 500);

    // Optionally update auth.users to match (Admin API)
    // await supabaseAdmin.auth.admin.updateUserById(profile.id, { email_confirm: true }); // pseudocode, actual API differs

    return successResponse({ message: "Email verified successfully" });
}

export const POST = createApiHandler(verifyEmail);
