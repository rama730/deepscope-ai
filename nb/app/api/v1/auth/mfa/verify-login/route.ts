import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const verifyLoginSchema = z.object({
    factorId: z.string().min(1),
    challengeId: z.string().min(1),
    code: z.string().min(6)
});

async function verifyMfaLogin(request: NextRequest) {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const json = await request.json();
    const result = verifyLoginSchema.safeParse(json);
    if (!result.success) return validationErrorResponse(result.error.issues.map(e => e.message));

    const { factorId, challengeId, code } = result.data;
    const supabase = createSupabaseServerClient();

    // Verify
    const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code
    });

    if (error) {
        return errorResponse("Invalid code", 400, error.message);
    }

    // Success! Supabase automatically upgrades the session to AAL2/aal2 upon verification.
    // The client should reload or handle the new session state.
    
    return successResponse({ message: "Login verification successful" });
}

export const POST = createApiHandler(verifyMfaLogin);
