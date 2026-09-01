import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    const bucket = formData.get("bucket") as string || "project-files"; // Default to project files
    const path = formData.get("path") as string || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validation (Size/Type)
    // Supabase Storage limits can be set in bucket policies, but server-side check is good too.
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "File too large (Max 10MB)" }, { status: 400 });
    }

    // Generate unique filename if path not provided or strict naming needed
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    // Direct Server-Side Upload (Bypassing client RLS for 'upload' if needed, or respecting them? 
    // Using server client respects RLS if created with user context, which it is.
    // However, if we want to enforce specific logic, we can do it here.)
    
    // Note: The 'bucket' must exist and user must have permissions via RLS policies 
    // UNLESS we use Service Role (which createSupabaseServerClient DOES NOT use by default, it uses user session).
    // So this relies on RLS policies being correct.
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get Public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        path: data.path,
        name: file.name,
        size: file.size,
        type: file.type
      }
    });

  } catch (error: any) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
