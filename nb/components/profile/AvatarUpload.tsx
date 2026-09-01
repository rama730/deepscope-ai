"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera } from "lucide-react";

interface AvatarUploadProps {
    currentUrl?: string | null;
    onUploadSuccess: (url: string) => void;
    name: string;
}

export function AvatarUpload({ currentUrl, onUploadSuccess, name }: AvatarUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Local Preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setIsUploading(true);

        try {
            // 1. Upload and Optimize
            const formData = new FormData();
            formData.append("file", file);
            formData.append("bucket", "avatars");
            formData.append("category", "profiles");

            const uploadRes = await fetch("/api/v1/images/upload", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) {
                let errMsg = "Upload failed";
                try {
                    const err = await uploadRes.json();
                    errMsg = err.error || errMsg;
                } catch { }
                throw new Error(errMsg);
            }

            const uploadData = await uploadRes.json();
            const optimizedUrl = uploadData.data.urls.thumbnail; // Use thumbnail for avatar

            // 2. Update Profile with optimized URL
            const updateRes = await fetch("/api/v1/users/me", {
                method: "PUT", // Using PUT as per previous refactor
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatar_url: optimizedUrl }),
            });

            if (!updateRes.ok) throw new Error("Failed to update profile");

            // Safe parse update response
            try {
                await updateRes.json();
            } catch {
                // Ignore json error if update worked (ok=true), but log it
            }

            // Success
            onUploadSuccess(optimizedUrl);

        } catch (error) {
            console.error(error);
            // Revert preview? For now just log.
            // setPreviewUrl(currentUrl || null); 
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                    <AvatarImage src={previewUrl || ""} alt={name} />
                    <AvatarFallback>{name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />
        </div>
    );
}
