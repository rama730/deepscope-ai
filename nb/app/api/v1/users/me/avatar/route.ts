import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

async function uploadAvatar(request: NextRequest) {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
        return errorResponse("No file uploaded", 400);
    }

    // Basic Validation
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return errorResponse("File too large (max 5MB)", 400);
    }
    if (!file.type.startsWith('image/')) {
        return errorResponse("Invalid file type", 400);
    }

    const supabase = createSupabaseServerClient();
    
    // Get current avatar URL to delete old files
    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

    // Delete old avatar files if they exist
    if (currentProfile?.avatar_url) {
        try {
            // Extract file path from URL or delete all files in user's avatar folder
            // List all files in the user's folder and delete them
            const { data: files } = await supabase.storage
                .from('avatars')
                .list(user.id, {
                    limit: 100,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (files && files.length > 0) {
                const filePaths = files.map(f => `${user.id}/${f.name}`);
                await supabase.storage
                    .from('avatars')
                    .remove(filePaths);
            }
        } catch (error) {
            // Log but don't fail - old file cleanup is best effort
            console.warn('Failed to delete old avatar files:', error);
        }
    }

    const fileExt = (file.name.split('.').pop() || "png").toLowerCase();
    // Use consistent path: user_id/avatar.ext (single file per user)
    const filePath = `${user.id}/avatar.${fileExt}`;

    // Upload to Storage (upsert will replace if exists)
    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type || undefined, cacheControl: "3600" });

    if (uploadError) {
         return errorResponse("Failed to upload image", 500, uploadError.message);
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    // Update Profile
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

    if (updateError) {
        return errorResponse("Failed to update profile avatar", 500);
    }

    return successResponse({ avatar_url: publicUrl });
}

export const PATCH = createApiHandler(uploadAvatar);
