// import { NextRequest } from "next/server"; // Removed unused import
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

/**
 * @route POST /api/v1/auth/mfa/challenge
 * @description API endpoint to generate MFA challenge for AAL2 authentication
 * @requiresAuth true
 * @returns {Object} MFA challenge data
 */

// This is called when user is logged in (AAL1) but needs AAL2
async function challengeMfa() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const supabase = createSupabaseServerClient();

    // Get Enrolled Factors
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) return errorResponse(factorsError.message, 500);

    const totpFactor = factors.totp.find(f => f.status === 'verified');
    if (!totpFactor) {
        return errorResponse("No verified MFA factor found", 400);
    }

    // Create Challenge
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

    if (challengeError) {
        return errorResponse(challengeError.message, 500);
    }

    return successResponse({ 
        factorId: totpFactor.id, 
        challengeId: challenge.id 
    });
}

export const POST = createApiHandler(challengeMfa);
