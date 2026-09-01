"use client";

import { motion } from "framer-motion";

export function ConnectionSkeleton() {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            {/* Avatar Skeleton */}
            <div className="relative w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 overflow-hidden">
                <motion.div
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ translateX: ["-100%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
            </div>

            {/* Text Skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 w-1/3 bg-zinc-100 dark:bg-zinc-800 rounded relative overflow-hidden">
                    <motion.div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ translateX: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                </div>
                <div className="h-3 w-1/4 bg-zinc-100 dark:bg-zinc-800 rounded relative overflow-hidden">
                    <motion.div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ translateX: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                </div>
            </div>
        </div>
    );
}
