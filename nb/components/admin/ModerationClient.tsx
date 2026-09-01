"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ReportRow {
    id: string;
    reason: string;
    status: string;
    created_at: string;
    posts: {
        id: string;
        content: string;
        user_id: string;
    } | null;
    reporter: {
        id: string;
        username: string | null;
        full_name: string | null;
    } | null;
}

interface ModerationClientProps {
    initialReports: ReportRow[];
}

export default function ModerationClient({ initialReports }: ModerationClientProps) {
    const supabase = createSupabaseBrowserClient();
    const [reports, setReports] = useState<ReportRow[]>(initialReports);

    async function updateStatus(id: string, status: string) {
        await supabase.from("reports").update({ status }).eq("id", id);
        setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Moderation</h1>
            {reports.length === 0 ? (
                <div className="rounded-lg border p-6 text-sm text-zinc-500">No reports found.</div>
            ) : (
                <div className="space-y-3">
                    {reports.map((r) => (
                        <div key={r.id} className="rounded-lg border p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="text-sm"><span className="font-medium">Reason:</span> {r.reason}</div>
                                    <div className="text-sm text-zinc-500">Submitted: {new Date(r.created_at).toLocaleString("en-US")}</div>
                                    <div className="text-sm"><span className="font-medium">Reporter:</span> {r.reporter?.full_name || r.reporter?.username || r.reporter?.id}</div>
                                    {r.posts && (
                                        <div className="mt-2 text-sm">
                                            <div className="font-medium mb-1">Post</div>
                                            <div className="rounded-md border p-3 bg-zinc-50 dark:bg-zinc-900">{r.posts.content}</div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs rounded-full px-2 py-1 border">{r.status}</span>
                                    <button onClick={() => updateStatus(r.id, "reviewed")} className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white dark:bg-zinc-900/10">Mark reviewed</button>
                                    <button onClick={() => updateStatus(r.id, "resolved")} className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white dark:bg-zinc-900/10">Resolve</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
