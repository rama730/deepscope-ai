import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const notificationsSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  projects: z.boolean().optional(),
  followers: z.boolean().optional(),
  endorsements: z.boolean().optional(),
  messages: z.boolean().optional(),
});

async function updateNotifications(request: NextRequest) {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const json = await request.json();
    const result = notificationsSchema.safeParse(json);

    if (!result.success) {
        return validationErrorResponse(result.error.issues.map((e: any) => e.message));
    }

    const updates = result.data;
    const supabase = createSupabaseServerClient();

    // Get current preferences first to merge
    const { data: profile } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();
    
    const currentPrefs = (profile?.notification_preferences as object) || {};
    const newPrefs = { ...currentPrefs, ...updates };

    const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: newPrefs })
        .eq('id', user.id);

    if (error) {
        return errorResponse("Failed to update notifications", 500, error.message);
    }

    return successResponse(newPrefs);
}

export const PATCH = createApiHandler(updateNotifications);
