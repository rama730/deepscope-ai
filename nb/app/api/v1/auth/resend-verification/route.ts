import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";
import { generateVerificationToken, getVerificationExpiration } from "@/lib/api/verification";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const dynamic = 'force-dynamic';

/**
 * @route POST /api/v1/auth/resend-verification
 * @description API endpoint to resend email verification token
 * @requiresAuth true
 * @returns {Object} Success response
 */

async function resendVerification() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return errorResponse("Server configuration error", 500);

    const supabaseAdmin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if already verified
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email_verified')
        .eq('id', user.id)
        .single();
    
    if (profile?.email_verified) {
        return errorResponse("Email is already verified", 400);
    }

    // Generate new token
    const token = generateVerificationToken();
    const expiresAt = getVerificationExpiration();

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({
            verification_token: token,
            verification_expires_at: expiresAt.toISOString()
        })
        .eq('id', user.id);

    if (error) return errorResponse("Failed to generate token", 500);

    // Mock Email Send
    console.log(`[Mock Email] Resending verification to ${user.email}: /verify-email?token=${token}`);

    return successResponse({ message: "Verification email sent" });
}

export const POST = createApiHandler(resendVerification);
