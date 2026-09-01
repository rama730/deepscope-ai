import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { validateFileUpload } from "@/lib/messages/validation";
import { logger } from "@/lib/logger";

/**
 * Secure file upload API for message attachments
 * 
 * @route POST /api/messages/upload
 * @body FormData with 'file' and 'sender_id'
 * @returns {Object} Upload result with URL and file metadata
 * @throws {400} Invalid file or missing parameters
 * @throws {401} Unauthorized
 * @throws {403} Invalid CSRF token
 * @throws {413} Request entity too large
 * @throws {429} Rate limit exceeded
 * @throws {500} Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request size (10MB max for file uploads)
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (!isNaN(size) && size > maxSize) {
        return NextResponse.json(
          { error: `File too large. Maximum size: ${maxSize} bytes`, code: "FILE_TOO_LARGE" },
          { status: 413 }
        );
      }
    }

    // Verify CSRF token
    const csrfToken = getCSRFTokenFromHeader(request);
    const isValid = await verifyCSRFToken(csrfToken);
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const senderId = formData.get('sender_id') as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFileUpload({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid file" },
        { status: 400 }
      );
    }

    // Verify authentication
    const supabase = createSupabaseServerClient(request);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== senderId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limiting for file uploads
    const { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } = await import("@/lib/api/rate-limit");
    const { identifier, type } = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = await checkRateLimit(
      request,
      identifier,
      type,
      'upload_file',
      RATE_LIMITS.UPLOAD_FILE
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message || "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
        { 
          status: 429,
          headers: rateLimitResult.lockedUntil ? {
            "Retry-After": Math.ceil((new Date(rateLimitResult.lockedUntil).getTime() - Date.now()) / 1000).toString()
          } : {}
        }
      );
    }

    // Generate secure filename
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const secureFileName = `msg_${user.id}_${timestamp}_${randomId}.${fileExt}`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(secureFileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("File upload error", { error: uploadError.message });
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(secureFileName);

    logger.info("File uploaded successfully", { fileName: secureFileName, size: file.size });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: secureFileName,
      size: file.size,
      type: file.type,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("File upload API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
