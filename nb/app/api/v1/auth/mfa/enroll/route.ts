import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

/**
 * @route POST /api/v1/auth/mfa/enroll
 * @description API endpoint to enroll in multi-factor authentication (TOTP)
 * @requiresAuth true
 * @returns {Object} MFA enrollment data with QR code
 */

async function enrollMfa() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const supabase = createSupabaseServerClient();

    // Enroll (Generate Secret)
    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
    });

    if (error) {
        return errorResponse("Failed to enroll in MFA", 500, error.message);
    }

    return successResponse({
        id: data.id,
        type: data.type,
        totp: data.totp // contains secret, qr_code, uri
    });
}

export const POST = createApiHandler(enrollMfa);
