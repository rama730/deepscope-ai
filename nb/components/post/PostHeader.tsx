"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui-custom/Toast";

export default function PostHeader() {
    const router = useRouter();
    const { showToast } = useToast();

    return (
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h2 className="text-lg font-bold">Post</h2>
            <div className="ml-auto flex items-center gap-2">
                <button
                    type="button"
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(window.location.href);
                            showToast("Link copied", "success");
                        } catch { showToast("Failed to copy link", "error"); }
                    }}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors"
                >
                    Copy link
                </button>
            </div>
        </div>
    );
}
