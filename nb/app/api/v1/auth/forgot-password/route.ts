import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api/response";
import { createApiHandler } from "@/lib/api/handler";
import { generateVerificationToken, getVerificationExpiration } from "@/lib/api/verification";
import { env } from "@/lib/env";
import { z } from "zod";

export const dynamic = 'force-dynamic';

/**
 * @route POST /api/v1/auth/forgot-password
 * @description API endpoint to request a password reset email
 * @requiresAuth false
 * @requestBody { email: string }
 * @returns {Object} Success response
 */

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

async function forgotPassword(request: NextRequest) {
    const json = await request.json();
    const result = forgotPasswordSchema.safeParse(json);

    if (!result.success) {
        return validationErrorResponse(result.error.issues.map((e: any) => e.message));
    }

    const { email } = result.data;

    // Use Service Role to find user
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        return errorResponse("Server configuration error", 500);
    }

    const supabaseAdmin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user exists (checking profiles is safer/faster if synced)
    // We'll trust our profiles table sync, enabling RLS bypass via Admin
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (!profile) {
        // Security: Don't reveal user existence
        return successResponse({ message: "If an account exists, a reset email has been sent." });
    }

    // Generate Token
    const token = generateVerificationToken();
    const expiresAt = getVerificationExpiration(1); // 1 hour

    // Save to DB
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
            reset_token: token,
            reset_expires_at: expiresAt.toISOString()
        })
        .eq('id', profile.id);

    if (updateError) {
        return errorResponse("Failed to process request", 500);
    }

    // "Send" Email (Mock)
    console.log(`[Mock Email] Password Reset for ${email}. Link: ${env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`);

    return successResponse({ message: "If an account exists, a reset email has been sent." });
}

export const POST = createApiHandler(forgotPassword);
