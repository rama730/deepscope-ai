
import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui-custom/Toast";

interface ImageUploadProps {
    onUploadComplete?: (urls: { thumbnail: string; medium: string; large: string }) => void;
    category?: string; // 'avatars', 'projects', etc.
    className?: string;
    initialPreview?: string;
}

export default function ImageUpload({
    onUploadComplete,
    category = "general",
    className = "",
    initialPreview
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(initialPreview || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast("Please select an image file", "error");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showToast("Image must be smaller than 10MB", "error");
            return;
        }

        // Local preview before upload
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setIsUploading(true);

        try {
            // Compress Image
            const options = {
                maxSizeMB: 1, // Max 1MB
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                initialQuality: 0.8,
            };

            let fileToUpload = file;
            try {
                // Dynamic import to avoid SSR issues if any, though component is client-side
                const imageCompression = (await import("browser-image-compression")).default;
                const compressedFile = await imageCompression(file, options);

                // Create a new file with original name (but maybe new extension/type if converted, though here we keep it simple)
                // browser-image-compression usually preserves type or converts.
                fileToUpload = new File([compressedFile], file.name, { type: compressedFile.type });
                console.log(`Compressed image from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
            } catch (compressionError) {
                console.warn("Image compression failed, falling back to original:", compressionError);
            }

            const formData = new FormData();
            formData.append("file", fileToUpload);
            formData.append("category", category);
            formData.append("bucket", "project-files"); // Default bucket, change if needed

            const response = await fetch("/api/v1/images/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                // Try to read error message from JSON, fallback to status text
                let errorMsg = "Upload failed";
                try {
                    const errJson = await response.json();
                    errorMsg = errJson.error || errorMsg;
                } catch { }
                throw new Error(errorMsg);
            }

            let result;
            try {
                result = await response.json();
            } catch {
                throw new Error("Invalid server response (HTML)");
            }

            if (result.success && result.data?.urls) {
                showToast("Image uploaded successfully!", "success");
                onUploadComplete?.(result.data.urls);
                // Update preview to the optimized version (e.g. medium or thumbnail)
                setPreview(result.data.urls.medium);
            } else {
                throw new Error(result.error || "Unknown error");
            }

        } catch (error: any) {
            console.error("Upload error:", error);
            showToast(error.message || "Failed to upload image", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const clearImage = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className={`relative ${className}`}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            {preview ? (
                <div className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                    <div className="relative w-full h-auto max-h-[300px]">
                        <Image
                            src={preview}
                            alt="Preview"
                            width={500}
                            height={300}
                            className="w-full h-auto object-cover max-h-[300px]"
                            unoptimized={preview.startsWith('blob:')}
                        />
                    </div>

                    {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                    )}

                    {!isUploading && (
                        <button
                            onClick={clearImage}
                            className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all group"
                >
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-zinc-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Click to upload image</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                        JPG, PNG, WebP up to 10MB
                    </p>
                </div>
            )}
        </div>
    );
}
