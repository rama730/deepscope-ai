"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LinkPreviewProps {
    url: string;
}

interface PreviewData {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    url?: string;
    favicon?: string;
}

export default function LinkPreviewCard({ url }: LinkPreviewProps) {
    const [data, setData] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function fetchPreview() {
            try {
                setLoading(true);
                // Use the internal API
                const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
                if (!res.ok) throw new Error("Failed to fetch");

                const json = await res.json();
                if (isMounted) {
                    if (json && (json.title || json.image)) {
                        setData(json);
                    } else {
                        setError(true);
                    }
                }
            } catch (err) {
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchPreview();
        return () => { isMounted = false; };
    }, [url]);

    if (error) return null; // Hide if failed

    if (loading) {
        return (
            <div className="mt-2 w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900/50">
                <Skeleton className="h-40 w-full" />
                <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="block mt-2 w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group/card"
        >
            {data.image && (
                <div className="relative h-40 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
                    <Image
                        src={data.image}
                        alt={data.title || "Link preview"}
                        fill
                        className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                    />
                </div>
            )}
            <div className="p-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1 mb-1 group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors">
                    {data.title}
                </h3>
                {data.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-2">
                        {data.description}
                    </p>
                )}
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {data.favicon ? (
                        <Image src={data.favicon} alt="" width={12} height={12} className="w-3 h-3" unoptimized />
                    ) : (
                        <ExternalLink className="w-3 h-3" />
                    )}
                    <span className="truncate max-w-[200px]">{data.siteName || new URL(url).hostname}</span>
                </div>
            </div>
        </a>
    );
}
