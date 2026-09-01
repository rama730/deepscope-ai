"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Report {
    id: string;
    reporter_id: string;
    reported_user_id: string | null;
    post_id: string | null;
    project_id: string | null;
    reason: string;
    status: string;
    created_at: string;
    reporter?: {
        id: string;
        full_name: string | null;
        username: string | null;
    };
    reported_user?: {
        id: string;
        full_name: string | null;
        username: string | null;
    };
    post?: {
        id: string;
        content: string;
    };
}

interface ReportsAdminClientProps {
    initialReports: Report[];
    initialUser: any;
    isAdmin: boolean;
}

export default function ReportsAdminClient({ initialReports, initialUser, isAdmin }: ReportsAdminClientProps) {
    const supabase = createSupabaseBrowserClient();
    const [reports, setReports] = useState<Report[]>(initialReports);
    const [loading, setLoading] = useState(!initialReports);
    const [filter, setFilter] = useState<"pending" | "reviewed" | "all">("pending");
    const [currentUser, setCurrentUser] = useState<any>(initialUser);

    useEffect(() => {
        if (!initialUser) {
            loadCurrentUser();
        }
    }, [initialUser]);

    useEffect(() => {
        if (!initialReports && currentUser && isAdmin) {
            loadReports();
        }
    }, [currentUser, isAdmin, filter, initialReports]);

    async function loadCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    }

    async function loadReports() {
        setLoading(true);

        let query = supabase
            .from("reports")
            .select(`
        id,
        reporter_id,
        reported_user_id,
        post_id,
        project_id,
        reason,
        status,
        created_at
      `)
            .order("created_at", { ascending: false });

        if (filter !== "all") {
            query = query.eq("status", filter);
        }

        const { data } = await query;

        if (data) {
            // Load related data
            const reporterIds = [...new Set(data.map((r: any) => r.reporter_id))];
            const reportedUserIds = [...new Set(data.map((r: any) => r.reported_user_id).filter(Boolean))];
            const postIds = [...new Set(data.map((r: any) => r.post_id).filter(Boolean))];

            const [
                { data: reporters },
                { data: reportedUsers },
                { data: posts }
            ] = await Promise.all([
                supabase.from("profiles").select("id, full_name, username").in("id", reporterIds),
                reportedUserIds.length > 0
                    ? supabase.from("profiles").select("id, full_name, username").in("id", reportedUserIds)
                    : Promise.resolve({ data: [] }),
                postIds.length > 0
                    ? supabase.from("posts").select("id, content").in("id", postIds)
                    : Promise.resolve({ data: [] })
            ]);

            const reporterMap = new Map((reporters || []).map((r: any) => [r.id, r]));
            const reportedUserMap = new Map((reportedUsers || []).map((r: any) => [r.id, r]));
            const postMap = new Map((posts || []).map((p: any) => [p.id, p]));

            const enrichedReports = data.map((report: any) => ({
                ...report,
                reporter: reporterMap.get(report.reporter_id),
                reported_user: report.reported_user_id ? reportedUserMap.get(report.reported_user_id) : null,
                post: report.post_id ? postMap.get(report.post_id) : null
            }));

            setReports(enrichedReports);
        }

        setLoading(false);
    }

    async function updateReportStatus(reportId: string, status: string) {
        await supabase
            .from("reports")
            .update({ status })
            .eq("id", reportId);

        loadReports();
    }

    async function deleteReportedPost(postId: string, reportId: string) {
        if (!confirm("Are you sure you want to delete this post?")) return;

        await supabase.from("posts").delete().eq("id", postId);
        await updateReportStatus(reportId, "reviewed");
    }

    function formatTimestamp(timestamp: string) {
        return new Date(timestamp).toLocaleString("en-US");
    }

    function getReportTypeIcon(report: Report) {
        if (report.post_id) {
            return (
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                </div>
            );
        } else if (report.reported_user_id) {
            return (
                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
            );
        } else {
            return (
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
            );
        }
    }

    function getReportType(report: Report): string {
        if (report.post_id) return "Post";
        if (report.reported_user_id) return "User";
        if (report.project_id) return "Project";
        return "Other";
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl">
                <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                    Loading reports...
                </div>
            </div>
        );
    }

    if (!currentUser || !isAdmin) {
        return (
            <div className="mx-auto max-w-6xl">
                <div className="rounded-lg border p-8 text-center">
                    <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-lg font-semibold mb-2">Access Denied</p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        You don't have permission to view this page.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">Reports Management</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Review and manage user-submitted reports
                </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-4 border-b">
                <button
                    onClick={() => setFilter("pending")}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${filter === "pending"
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                >
                    Pending ({reports.filter(r => r.status === "pending").length})
                </button>
                <button
                    onClick={() => setFilter("reviewed")}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${filter === "reviewed"
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                >
                    Reviewed
                </button>
                <button
                    onClick={() => setFilter("all")}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${filter === "all"
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                >
                    All ({reports.length})
                </button>
            </div>

            {/* Reports List */}
            {reports.length === 0 ? (
                <div className="rounded-lg border p-8 text-center">
                    <svg className="w-12 h-12 mx-auto text-zinc-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {filter === "pending" ? "No pending reports" : "No reports found"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reports.map((report) => (
                        <div key={report.id} className="rounded-lg border p-4 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900/50 transition-colors">
                            <div className="flex items-start gap-4">
                                {getReportTypeIcon(report)}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold">{getReportType(report)} Report</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${report.status === "pending"
                                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                                                    : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                                    }`}>
                                                    {report.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                Reported by {report.reporter?.full_name || report.reporter?.username || "Unknown"} · {formatTimestamp(report.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Reason:</p>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{report.reason}</p>
                                        </div>

                                        {report.post && (
                                            <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                                <p className="text-xs font-medium text-zinc-500 mb-1">Reported Post:</p>
                                                <p className="text-sm line-clamp-2">{report.post.content}</p>
                                                <Link href={`/post/${report.post_id}`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                                                    View post →
                                                </Link>
                                            </div>
                                        )}

                                        {report.reported_user && (
                                            <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                                <p className="text-xs font-medium text-zinc-500 mb-1">Reported User:</p>
                                                <Link href={`/profile/${report.reported_user_id}`} className="text-sm text-blue-600 hover:underline">
                                                    {report.reported_user.full_name || report.reported_user.username || "Unknown"} →
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {report.status === "pending" && (
                                        <div className="flex items-center gap-2 mt-3">
                                            {report.post_id && (
                                                <button
                                                    onClick={() => deleteReportedPost(report.post_id!, report.id)}
                                                    className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700"
                                                >
                                                    Delete Post
                                                </button>
                                            )}
                                            <button
                                                onClick={() => updateReportStatus(report.id, "reviewed")}
                                                className="px-3 py-1.5 text-xs rounded-lg border hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                            >
                                                Mark as Reviewed
                                            </button>
                                            <button
                                                onClick={() => updateReportStatus(report.id, "dismissed")}
                                                className="px-3 py-1.5 text-xs rounded-lg border hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
