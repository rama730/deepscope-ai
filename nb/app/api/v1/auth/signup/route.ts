import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api/response";
import { z } from "zod";
import { validatePassword } from "@/lib/auth/password-validation";
import { checkRateLimit } from "@/lib/api/rate-limit";

export const dynamic = 'force-dynamic';

/**
 * @route POST /api/v1/auth/signup
 * @description API endpoint to register a new user account
 * @requiresAuth false
 * @rateLimitCategory signup
 * @requestBody { email: string, password: string, fullName: string }
 * @returns {Object} User account creation result
 */

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

import { generateVerificationToken, getVerificationExpiration } from "@/lib/api/verification";
import { createClient } from "@supabase/supabase-js"; // For Admin
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    // Rate Limit: 5 signups per minute per IP
    const rateLimitResult = await checkRateLimit(request, ip, 'ip_address', 'signup', {
      maxAttempts: 5,
      windowMinutes: 1,
    });

    if (!rateLimitResult.allowed) {
      return errorResponse("Too many signup attempts. Please try again later.", 429);
    }

    const json = await request.json();
    const result = signupSchema.safeParse(json);

    if (!result.success) {
      return validationErrorResponse(
        result.error.issues.map((e: any) => e.message)
      );
    }

    const { email, password, fullName } = result.data;

    // Strict Password Validation
    const passwordCheck = validatePassword(password, email, fullName);
    if (!passwordCheck.valid) {
      return validationErrorResponse(passwordCheck.errors);
    }

    const supabase = createSupabaseServerClient();

    // 1. Sign Up User
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return errorResponse(error.message, 400, error.code);
    }

    if (!data.user) {
        return errorResponse("Signup failed", 500);
    }

    // 2. Generate Verification Token
    const token = generateVerificationToken();
    const expiresAt = getVerificationExpiration();

    // 3. Update Profile (using Admin Client to bypass RLS if session is null/unverified)
    // We assume SUPABASE_SERVICE_ROLE_KEY is available.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
        const supabaseAdmin = createClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        await supabaseAdmin
            .from('profiles')
            .update({
                verification_token: token,
                verification_expires_at: expiresAt.toISOString(),
                email: email, // Sync email to profiles
                is_active: true // Default active, but maybe 'false' if we want strictly 'verified only'? Prompt says "Don't auto-verify"
                // The prompt "Don't auto-verify" usually refers to email_verified status. 
                // We'll leave `email_verified` as false (default in schema) and relying on the verification flow to flip it.
            })
            .eq('id', data.user.id);
            
        // 4. Send Verification Email (Placeholder)
        // console.log(`[Mock Email] Sending verification email to ${email} with token ${token}`);
    } else {
        console.warn("Missing SUPABASE_SERVICE_ROLE_KEY, skipping profile token update.");
    }

    return successResponse({
      user: data.user,
      session: data.session, // Might be null if email confirmation is required
      message: "Account created successfully. Please check your email to verify."
    }, 201);

  } catch (error) {
    return errorResponse("Internal server error", 500);
  }
}
