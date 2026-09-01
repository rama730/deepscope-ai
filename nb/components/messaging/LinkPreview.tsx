"use client";

import { useLinkPreview } from "@/hooks/useLinkPreview";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface LinkPreviewProps {
    url: string;
    className?: string;
}

export function LinkPreview({ url, className }: LinkPreviewProps) {
    const { preview, loading, error } = useLinkPreview(url);

    if (loading) {
        return (
            <div className={cn("flex items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg", className)}>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                <span className="text-xs text-zinc-500">Loading preview...</span>
            </div>
        );
    }

    if (error || !preview) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                    "inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline",
                    className
                )}
            >
                {url}
                <ExternalLink className="w-3 h-3" />
            </a>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "block border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden",
                "hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600 transition-colors",
                "bg-white dark:bg-zinc-900",
                className
            )}
        >
            {preview.image && (
                <div className="relative w-full h-48 bg-zinc-100 dark:bg-zinc-800">
                    <Image
                        src={preview.image}
                        alt={preview.title || "Link preview"}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                </div>
            )}
            <div className="p-3">
                {preview.siteName && (
                    <div className="flex items-center gap-2 mb-1">
                        {preview.favicon && (
                            <img
                                src={preview.favicon}
                                alt=""
                                className="w-4 h-4"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        )}
                        <span className="text-xs text-zinc-500 uppercase">
                            {preview.siteName}
                        </span>
                    </div>
                )}
                {preview.title && (
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 line-clamp-2">
                        {preview.title}
                    </h4>
                )}
                {preview.description && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {preview.description}
                    </p>
                )}
            </div>
        </a>
    );
}
