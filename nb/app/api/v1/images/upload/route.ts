import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import sharp from "sharp";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const bucket = formData.get("bucket") as string || "project-files";
    // Optional: category/folder (e.g., 'avatars', 'gallery')
    const category = formData.get("category") as string || "general"; 

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // 10MB limit for raw input
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (Max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // For avatars, delete old files and use consistent naming
    const isAvatar = bucket === 'avatars' && category === 'profiles';
    let baseName: string;
    
    if (isAvatar) {
      // Delete old avatar files for this user
      try {
        // List files in user's folder (if exists) and in profiles folder
        const pathsToCheck = [`${user.id}`, category];
        const filesToDelete: string[] = [];
        
        for (const pathPrefix of pathsToCheck) {
          const { data: files } = await supabase.storage
            .from(bucket)
            .list(pathPrefix, {
              limit: 1000,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (files) {
            // Filter files that belong to this user
            const userFiles = files.filter(f => {
              const fileName = f.name.toLowerCase();
              // Match files that start with user.id or contain avatar in name
              return fileName.startsWith(`${user.id}_`) || 
                     fileName.startsWith('avatar_') ||
                     fileName.includes(`_${user.id}_`) ||
                     fileName.match(/avatar.*\.(webp|jpg|jpeg|png)$/i);
            });
            
            userFiles.forEach(f => {
              // Construct proper file path
              const filePath = pathPrefix ? `${pathPrefix}/${f.name}` : f.name;
              filesToDelete.push(filePath);
            });
          }
        }
        
        // Also check root level for old timestamp-based files
        const { data: rootFiles } = await supabase.storage
          .from(bucket)
          .list('', { limit: 1000 });
        
        if (rootFiles) {
          const userRootFiles = rootFiles.filter(f => 
            f.name.startsWith(`${user.id}_`) || 
            (f.name.includes(user.id) && f.name.match(/\.(webp|jpg|jpeg|png)$/i))
          );
          userRootFiles.forEach(f => filesToDelete.push(f.name));
        }
        
        if (filesToDelete.length > 0) {
          await supabase.storage
            .from(bucket)
            .remove(filesToDelete);
        }
      } catch (error) {
        // Log but don't fail - old file cleanup is best effort
        console.warn('Failed to delete old avatar files:', error);
      }
      
      // Use consistent naming for avatars: user_id/avatar_size.webp
      baseName = `${user.id}/avatar`;
    } else {
      // For other files, use timestamp-based naming
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
      baseName = `${user.id}_${timestamp}_${randomId}`;
    }
    
    // Define sizes
    const sizes = {
      thumbnail: { width: 200, height: 200, fit: "cover" as const },
      medium: { width: 800, height: 800, fit: "inside" as const }, // Maintain aspect ratio within 800x800
      large: { width: 1200, height: 1200, fit: "inside" as const }, // Maintain aspect ratio within 1200x1200
    };

    const uploadPromises = [];
    const results: Record<string, string> = {};

    // 1. Process Large (Original-ish)
    const largeBuffer = await sharp(buffer)
      .resize(sizes.large.width, sizes.large.height, { fit: sizes.large.fit, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    
    const largePath = isAvatar ? `${baseName}_large.webp` : `${category}/${baseName}_large.webp`;
    uploadPromises.push(
      supabase.storage.from(bucket).upload(largePath, largeBuffer, { contentType: 'image/webp', upsert: isAvatar })
        .then(({ error }) => {
           if (error) throw error;
           const { data: url } = supabase.storage.from(bucket).getPublicUrl(largePath);
           results.large = url.publicUrl;
        })
    );

    // 2. Process Medium
    const mediumBuffer = await sharp(buffer)
      .resize(sizes.medium.width, sizes.medium.height, { fit: sizes.medium.fit, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const mediumPath = isAvatar ? `${baseName}_medium.webp` : `${category}/${baseName}_medium.webp`;
    uploadPromises.push(
       supabase.storage.from(bucket).upload(mediumPath, mediumBuffer, { contentType: 'image/webp', upsert: isAvatar })
        .then(({ error }) => {
           if (error) throw error;
           const { data: url } = supabase.storage.from(bucket).getPublicUrl(mediumPath);
           results.medium = url.publicUrl;
        })
    );

    // 3. Process Thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(sizes.thumbnail.width, sizes.thumbnail.height, { fit: sizes.thumbnail.fit }) // Square crop
      .webp({ quality: 80 })
      .toBuffer();

    const thumbnailPath = isAvatar ? `${baseName}_thumbnail.webp` : `${category}/${baseName}_thumbnail.webp`;
    uploadPromises.push(
       supabase.storage.from(bucket).upload(thumbnailPath, thumbnailBuffer, { contentType: 'image/webp', upsert: isAvatar })
        .then(({ error }) => {
           if (error) throw error;
           const { data: url } = supabase.storage.from(bucket).getPublicUrl(thumbnailPath);
           results.thumbnail = url.publicUrl;
        })
    );

    await Promise.all(uploadPromises);

    return NextResponse.json({
      success: true,
      data: {
        urls: results,
        originalName: file.name,
        type: 'image/webp'
      }
    });

  } catch (error: any) {
    console.error("Image Processing Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
