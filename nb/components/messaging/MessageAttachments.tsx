"use client";

import { MessageAttachment } from "@/lib/services/messaging/index";
import { Download, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ImageGallery } from "./ImageGallery";
import { VideoPlayer } from "./VideoPlayer";
import { getOptimizedImageUrl } from "@/lib/utils/image";
import Image from "next/image";

interface MessageAttachmentsProps {
    attachments: MessageAttachment[];
    className?: string;
    onLoad?: () => void;
}

export function MessageAttachments({ attachments, className, onLoad }: MessageAttachmentsProps) {
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);

    if (attachments.length === 0) return null;

    const images = attachments.filter(att =>
        att.mime_type?.startsWith('image/') ||
        att.file_type === 'image'
    );
    const videos = attachments.filter(att =>
        att.mime_type?.startsWith('video/') ||
        att.file_type === 'video'
    );
    const files = attachments.filter(att =>
        !att.mime_type?.startsWith('image/') &&
        !att.mime_type?.startsWith('video/') &&
        att.file_type !== 'image' &&
        att.file_type !== 'video'
    );

    return (
        <div className={cn("space-y-2", className)}>
            {/* Images */}
            {images.length > 0 && (
                <div className={cn(
                    "grid gap-2",
                    images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                    {images.map((img, index) => (
                        <div
                            key={img.id}
                            className="relative cursor-pointer"
                            onClick={() => {
                                setGalleryIndex(index);
                                setGalleryOpen(true);
                            }}
                        >
                            <Image
                                src={getOptimizedImageUrl(img.file_url, 400)}
                                alt={img.file_name}
                                width={400}
                                height={300}
                                className="w-full h-auto rounded-lg object-cover max-h-64"
                                onLoad={onLoad}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Files */}
            {files.length > 0 && (
                <div className="space-y-1">
                    {files.map((file) => (
                        <a
                            key={file.id}
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                        >
                            <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                    {file.file_name}
                                </div>
                                {file.file_size && (
                                    <div className="text-xs text-muted-foreground">
                                        {(file.file_size / 1024).toFixed(1)} KB
                                    </div>
                                )}
                            </div>
                            <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </a>
                    ))}
                </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
                <div className="space-y-2">
                    {videos.map((video) => (
                        <VideoPlayer
                            key={video.id}
                            video={video}
                            className="w-full"
                        />
                    ))}
                </div>
            )}

            {/* Image Gallery */}
            <ImageGallery
                images={images}
                isOpen={galleryOpen}
                onClose={() => setGalleryOpen(false)}
                initialIndex={galleryIndex}
            />
        </div>
    );
}
