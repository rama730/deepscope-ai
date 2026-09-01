import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { updateProfilePatchSchema, updateProfileSchema } from "@/lib/validations/profile";
import { buildLocationDisplay } from "@/lib/location";

export const dynamic = 'force-dynamic';

/**
 * @route GET /api/v1/users/me
 * @route PUT /api/v1/users/me
 * @route PATCH /api/v1/users/me
 * @route DELETE /api/v1/users/me
 * @description API endpoints to get, update, or delete the current user's profile
 * @requiresAuth true
 * @returns {Object} User profile data
 */

function normalizeTextOrNull(val: unknown): string | null {
    if (typeof val !== "string") return null;
    const trimmed = val.trim();
    return trimmed.length ? trimmed : null;
}

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "undefined") continue;
        out[k] = v;
    }
    return out as Partial<T>;
}

function normalizeProfileUpdates(updates: any) {
    if (!updates || typeof updates !== "object") return updates;

    // Normalize date input for Postgres DATE columns: empty string => null
    if (typeof updates.date_of_birth === "string" && updates.date_of_birth.trim() === "") {
        updates.date_of_birth = null;
    }

    // Normalize empty bio strings to null (consistent storage)
    if (typeof updates.bio === "string" && updates.bio.trim() === "") {
        updates.bio = null;
    }

    // Normalize + recompute display location when normalized fields are present.
    const hasLocationParts =
        Object.prototype.hasOwnProperty.call(updates, "location_city") ||
        Object.prototype.hasOwnProperty.call(updates, "location_region") ||
        Object.prototype.hasOwnProperty.call(updates, "location_country");

    if (hasLocationParts) {
        const city = normalizeTextOrNull(updates.location_city);
        const region = normalizeTextOrNull(updates.location_region);
        const country = normalizeTextOrNull(updates.location_country);

        const display = buildLocationDisplay(city, region, country);

        updates.location_city = city;
        updates.location_region = region;
        updates.location_country = country;
        updates.location = display ? display : null;

        const rawSource = typeof updates.location_source === "string" ? updates.location_source.trim() : "";
        if (display) {
            // Backward-compatible: some DBs still only allow ('ip_geo','user').
            const persisted = rawSource === "device_geo" ? "user" : (rawSource || "user");
            updates.location_source = persisted;
        } else {
            updates.location_source = null;
        }
    }

    return updates;
}

// GET /api/v1/users/me
async function getMe() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const supabase = createSupabaseServerClient();
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*') // Selects new columns too
        .eq('id', user.id)
        .single();

    if (error) {
        return errorResponse("Profile not found", 404, "NOT_FOUND");
    }

    return successResponse({
        id: user.id,
        email: user.email,
        ...profile
    });
}

// PUT /api/v1/users/me
async function updateMe(request: NextRequest) {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const json = await request.json();
    const result = updateProfileSchema.safeParse(json);

    if (!result.success) {
        return validationErrorResponse(result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`));
    }

    const updates: any = normalizeProfileUpdates(result.data);

    const supabase = createSupabaseServerClient();

    const { data: profile, error } = await supabase
        .from('profiles')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

    if (error) {
        const msg = error.message || "Failed to update profile";

        // PostgREST schema cache / missing column cases (common when migrations weren't applied to remote).
        if (msg.includes("schema cache") && msg.includes("date_of_birth") && msg.includes("profiles")) {
            return errorResponse(
                "Your Supabase database is missing `public.profiles.date_of_birth` (or the API schema cache hasn't reloaded). Apply migration `nb/supabase/migrations/0081_add_profile_fields.sql` to your Supabase project, then reload the schema cache.",
                500,
                "SCHEMA_MISMATCH"
            );
        }

        // Surface the real DB error so it's actionable (e.g., missing migrations/columns).
        return errorResponse(msg, 500, "DB_ERROR");
    }

    return successResponse(profile);
}

// PATCH /api/v1/users/me (partial update)
async function patchMe(request: NextRequest) {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    let json: any = null;
    try {
        json = await request.json();
    } catch {
        json = null;
    }

    const result = updateProfilePatchSchema.safeParse(json || {});
    if (!result.success) {
        return validationErrorResponse(result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`));
    }

    const raw = stripUndefined(result.data as any);
    if (!raw || Object.keys(raw).length === 0) {
        return validationErrorResponse("No fields provided");
    }

    const updates: any = normalizeProfileUpdates(raw);

    const supabase = createSupabaseServerClient();
    const { data: profile, error } = await supabase
        .from("profiles")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

    if (error) {
        const msg = error.message || "Failed to update profile";
        return errorResponse(msg, 500, "DB_ERROR");
    }

    return successResponse(profile);
}

// DELETE /api/v1/users/me
async function deleteMe() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    // Use Service Role for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
         return errorResponse("Server configuration error", 500);
    }
    const supabaseAdmin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check Last Admin Constraint
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profile?.role === 'admin') {
         const { count } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'admin');
         
         if (count !== null && count <= 1) {
             return errorResponse("Cannot delete the last administrator.", 403, "LAST_ADMIN_PROTECTION");
         }
    }

    // Delete User
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (error) {
        return errorResponse("Failed to delete account", 500, error.message);
    }

    return successResponse({ message: "Account deleted successfully" });
}

// Route Handler


export const GET = createApiHandler(getMe);
export const PUT = createApiHandler(updateMe);
export const PATCH = createApiHandler(patchMe);
export const DELETE = createApiHandler(deleteMe);
