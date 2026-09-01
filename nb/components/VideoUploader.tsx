"use client";

import { useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { X, Film, Loader2 } from "lucide-react";

interface VideoUploaderProps {
  onUpload: (videoUrl: string, thumbnailUrl?: string) => void;
  onRemove?: () => void;
  maxSizeMB?: number;
}

export default function VideoUploader({
  onUpload,
  onRemove,
  maxSizeMB = 100,
}: VideoUploaderProps) {
  const supabase = createSupabaseBrowserClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - macOS QuickTime files need special handling
    // Validate file type - macOS QuickTime files need special handling
    const SUPPORTED_VIDEO_EXTENSIONS = [
      'mp4', 'webm', 'ogg', 'mov', 'avi',
      'hevc', 'h265', 'h264', 'avc', 'mkv', 'm4v',
      'qt', 'mqv' // QuickTime variations
    ];

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isVideoMimeType = file.type.startsWith("video/");
    // const isSupportedMimeType = SUPPORTED_VIDEO_TYPES.includes(file.type); // Unused
    const isSupportedExtension = fileExt && SUPPORTED_VIDEO_EXTENSIONS.includes(fileExt);

    // macOS-specific: Handle empty or generic MIME types for QuickTime files
    const isEmptyMimeType = !file.type || file.type === '';
    const isQuickTimeFile = fileExt === 'mov' || fileExt === 'qt' || fileExt === 'mqv';

    // Allow if: video MIME type, supported extension, or QuickTime file with empty MIME
    if (!isVideoMimeType && !isSupportedExtension && !(isEmptyMimeType && isQuickTimeFile)) {
      setError(`Video format "${fileExt || 'unknown'}" is not supported. Supported formats: MP4, WebM, OGG, MOV (QuickTime), AVI, HEVC (H.265), H.264, MKV, M4V`);
      return;
    }

    // Warn about QuickTime format compatibility
    if (isQuickTimeFile) {
      console.warn('QuickTime (.mov) format detected. This format may not be supported by all browsers. For best compatibility, consider converting to MP4 format.');
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`Video must be smaller than ${maxSizeMB}MB`);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/videos/${Date.now()}.${fileExt}`;

      // Ensure proper MIME type for QuickTime videos
      let fileToUpload = file;
      if (fileExt?.toLowerCase() === 'mov' || fileExt?.toLowerCase() === 'qt') {
        // Create a new File with explicit MIME type for QuickTime
        // Some browsers don't detect .mov files correctly
        if (!file.type || file.type === '' || file.type === 'application/octet-stream') {
          fileToUpload = new File([file], file.name, {
            type: 'video/quicktime',
            lastModified: file.lastModified
          });
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(fileName, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
          contentType: fileToUpload.type || (fileExt?.toLowerCase() === 'mov' ? 'video/quicktime' : undefined),
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("post-media").getPublicUrl(fileName);

      // Generate thumbnail (optional - can be done server-side)
      // For now, we'll skip thumbnail generation
      const thumbnailUrl = undefined;

      setProgress(100);
      onUpload(publicUrl, thumbnailUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload video");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onRemove?.();
  };

  return (
    <div className="space-y-3">
      {!previewUrl ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading... {progress}%
            </>
          ) : (
            <>
              <Film className="w-4 h-4" />
              Upload Video
            </>
          )}
        </button>
      ) : (
        <div className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          <video
            src={previewUrl && (previewUrl.startsWith('blob:') || previewUrl.startsWith('http:') || previewUrl.startsWith('https:')) ? previewUrl : undefined}
            controls
            className="w-full max-h-96 object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black rounded-full text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,video/mp4,video/webm,video/ogg,video/quicktime,video/x-quicktime,video/qt,video/x-msvideo,video/hevc,video/h265,video/x-hevc,video/h264,video/x-h264,video/avc,video/x-avc,video/x-m4v,video/m4v,.mov,.qt,.mqv,.hevc,.h265,.h264,.avc,.mkv,.m4v"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}


