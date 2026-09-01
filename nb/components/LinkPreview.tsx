"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface LinkPreviewProps {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  faviconUrl?: string;
}

export default function LinkPreview({
  url,
  title: initialTitle,
  description: initialDescription,
  imageUrl: initialImageUrl,
  siteName: initialSiteName,
  faviconUrl: initialFaviconUrl,
}: LinkPreviewProps) {
  const [data, setData] = useState({
    title: initialTitle,
    description: initialDescription,
    imageUrl: initialImageUrl,
    siteName: initialSiteName,
    faviconUrl: initialFaviconUrl,
  });
  const [loading, setLoading] = useState(!initialTitle);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialTitle) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);

        // If not OK, or parsing fails, catch block handles it
        if (!res.ok) throw new Error("Failed to fetch");

        // Use try/catch for JSON parse specifically if we want to distinguish errors, 
        // but here the outer catch is enough AS LONG AS we verify content type or response. 
        // Safer:
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response type");
        }

        const json = await res.json();
        setData({
          title: json.title,
          description: json.description,
          imageUrl: json.image_url,
          siteName: json.site_name,
          faviconUrl: json.favicon,
        });
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [url, initialTitle]);

  const { domain, safeUrl } = (() => {
    try {
      const u = new URL(url);
      const isSafe = ["http:", "https:"].includes(u.protocol);
      return {
        domain: u.hostname.replace("www.", ""),
        safeUrl: isSafe ? url : "#",
      };
    } catch {
      return { domain: url, safeUrl: "#" };
    }
  })();

  if (error) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all" onClick={e => e.stopPropagation()}>
        {url}
      </a>
    );
  }

  // NOTE: We keep a consistent card footprint to avoid layout shift.
  // Loading -> Loaded uses a small crossfade/scale transition for a more "instant" feel.
  const motionCommon = {
    initial: { opacity: 0, y: 6, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -4, scale: 0.99 },
    transition: { duration: 0.18, ease: "easeOut" as const },
  };

  // If no title found even after fetch, just show URL
  if (!data.title && !loading) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all" onClick={e => e.stopPropagation()}>
        {url}
      </a>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {loading ? (
        <motion.div
          key="loading"
          {...motionCommon}
          className="mt-3 w-full h-24 bg-slate-50 dark:bg-zinc-800/50 rounded-xl animate-pulse flex items-center justify-center border border-slate-100 dark:border-zinc-800"
        >
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </motion.div>
      ) : (
        <motion.a
          key="loaded"
          {...motionCommon}
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-3 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group bg-white dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          {data.imageUrl && (
            <div className="aspect-[1.91/1] bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative">
              <Image
                src={data.imageUrl}
                alt={data.title || "Link preview"}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white font-medium z-10">
                {domain}
              </div>
            </div>
          )}
          <div className="p-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
              {data.faviconUrl && (
                <Image
                  src={data.faviconUrl}
                  alt=""
                  width={14}
                  height={14}
                  unoptimized
                  className="rounded-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <span className="truncate">{data.siteName || domain}</span>
            </div>

            {data.title && (
              <h4 className="font-semibold text-zinc-900 dark:text-white leading-snug mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {data.title}
              </h4>
            )}

            {data.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {data.description}
              </p>
            )}
          </div>
        </motion.a>
      )}
    </AnimatePresence>
  );
}


