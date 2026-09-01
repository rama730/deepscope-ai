import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api/response";
import { createApiHandler } from "@/lib/api/handler";
import { validatePassword } from "@/lib/auth/password-validation";
import { env } from "@/lib/env";
import { z } from "zod";

export const dynamic = 'force-dynamic';

/**
 * @route POST /api/v1/auth/reset-password
 * @description API endpoint to reset password using a reset token
 * @requiresAuth false
 * @requestBody { token: string, password: string }
 * @returns {Object} Success response
 */

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1), // Detailed check later
});

async function resetPassword(request: NextRequest) {
    const json = await request.json();
    const result = resetPasswordSchema.safeParse(json);

    if (!result.success) {
        return validationErrorResponse(result.error.issues.map((e: any) => e.message));
    }

    const { token, password } = result.data;

    // Use Service Role
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        return errorResponse("Server configuration error", 500);
    }

    const supabaseAdmin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find user by token
    const { data: profile, error: findError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, reset_expires_at')
        .eq('reset_token', token)
        .single();

    if (findError || !profile) {
        return errorResponse("Invalid or expired token", 400, "INVALID_TOKEN");
    }

    // Check expiry
    if (new Date(profile.reset_expires_at) < new Date()) {
        return errorResponse("Invalid or expired token", 400, "EXPIRED_TOKEN");
    }

    // Validate Password Strength
    // Need full name? We can fetch it, or just partial check.
    // Let's being strict but safe.
    const passwordCheck = validatePassword(password, profile.email || ""); // Full name might be partial if missing, it's ok.
    if (!passwordCheck.valid) {
      return validationErrorResponse(passwordCheck.errors);
    }

    // Update Password via Admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        profile.id,
        { password: password }
    );

    if (authError) {
        return errorResponse(authError.message, 500);
    }

    // Clear Token
    await supabaseAdmin
        .from('profiles')
        .update({
            reset_token: null,
            reset_expires_at: null
        })
        .eq('id', profile.id);

    // "Send" Confirmation Email (Mock)
    console.log(`[Mock Email] Password Changed for ${profile.email}`);

    return successResponse({ message: "Password has been reset successfully." });
}

export const POST = createApiHandler(resetPassword);
