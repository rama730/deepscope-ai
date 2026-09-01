import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";
import { validatePassword } from "@/lib/auth/password-validation";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

async function changePassword(request: NextRequest) {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth; // Supabase user object

    const json = await request.json();
    const result = changePasswordSchema.safeParse(json);

    if (!result.success) {
        return validationErrorResponse(result.error.issues.map((e: any) => e.message));
    }

    const { currentPassword, newPassword } = result.data;
    const supabase = createSupabaseServerClient();

    // 1. Verify Current Password by attempting a sign-in (or re-auth)
    // Unfortunately Supabase Client SDK doesn't have a simple "verify" without signing in.
    // We can try signInWithPassword.
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
    });

    if (signInError) {
        return errorResponse("Incorrect current password", 400);
    }

    // 2. Validate New Password Strength
    const passwordCheck = validatePassword(newPassword, user.email || "");
    if (!passwordCheck.valid) {
      return validationErrorResponse(passwordCheck.errors);
    }

    // 3. Update Password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (updateError) {
        return errorResponse("Failed to update password", 500, updateError.message);
    }

    return successResponse({ message: "Password updated successfully" });
}

export const PATCH = createApiHandler(changePassword);
