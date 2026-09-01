import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const verifySchema = z.object({
    factorId: z.string().min(1),
    code: z.string().min(6)
});

async function verifyMfaSetup(request: NextRequest) {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const json = await request.json();
    const result = verifySchema.safeParse(json);
    if (!result.success) return validationErrorResponse(result.error.issues.map(e => e.message));

    const { factorId, code } = result.data;
    const supabase = createSupabaseServerClient();

    // 1. Challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) return errorResponse(challengeError.message, 500);

    // 2. Verify
    const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
    });

    if (error) {
        return errorResponse("Invalid code", 400, error.message);
    }

    return successResponse({ message: "MFA enabled successfully" });
}

export const POST = createApiHandler(verifyMfaSetup);
