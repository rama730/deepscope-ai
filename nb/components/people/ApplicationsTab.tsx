"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Application } from "@/lib/types/application";
import { Loader2, Search, AlertCircle, RefreshCw, FileText } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ApplicationsTabProps {
    initialUser: any;
}

export default function ApplicationsTab({ initialUser }: ApplicationsTabProps) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "accepted" | "rejected" | "withdrawn">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

    const supabase = createSupabaseBrowserClient();

    const fetchApplications = async () => {
        if (!initialUser?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("project_applications")
                .select(`
          *,
          project:projects!project_applications_project_id_fkey(title, slug, creator_id),
          applicant_profile:profiles!project_applications_applicant_id_fkey(id, full_name, username, avatar_url)
        `)
                .eq("applicant_id", initialUser.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setApplications(data as Application[]);
        } catch (err: any) {
            console.error("Error fetching applications:", JSON.stringify(err, null, 2));
            toast.error("Failed to load applications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [initialUser?.id]);

    const handleWithdraw = async (app: Application) => {
        if (!confirm("Are you sure you want to withdraw this application?")) return;
        setProcessingId(app.id);
        try {
            const response = await fetch(`/api/applications/${app.id}/handle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "withdraw" }),
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || "Failed to withdraw");
            }

            toast.success("Application withdrawn");
            fetchApplications(); // Refresh list
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredApplications = applications.filter((app) => {
        const matchesStatus = filterStatus === "all" || app.status === filterStatus;
        const matchesSearch =
            searchQuery === "" ||
            app.project?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.role_applied_for.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "accepted":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Accepted</span>;
            case "rejected":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rejected</span>;
            case "withdrawn":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">Withdrawn</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>;
        }
    };

    const isCooldownActive = (app: Application) => {
        if (app.status !== 'rejected' && app.status !== 'withdrawn') return false;
        // Check if rejected_at or updated_at (for withdrawn) is within 24h
        // actually schema has rejected_at. For withdrawn, we might check updated_at or created_at?
        // The RPC check uses created_at. "created_at > (now() - interval '24 hours')"
        // So if the APPLICATION was created < 24h ago, you can't reapply. 
        // Wait, the RPC logic says: "WHERE ... created_at > (now() - interval '24 hours')".
        // This means if I applied 20 hours ago and got rejected 1 hour ago, I still have to wait 4 hours?
        // Yes, that seems to be the logic in `0145_add_application_cooldown.sql` (viewed in Step 66).
        const created = new Date(app.created_at).getTime();
        const now = Date.now();
        const cooldownMs = 24 * 60 * 60 * 1000;
        return (now - created) < cooldownMs;
    };

    const getCooldownTimeLeft = (app: Application) => {
        const created = new Date(app.created_at).getTime();
        const now = Date.now();
        const cooldownMs = 24 * 60 * 60 * 1000;
        const left = cooldownMs - (now - created);
        if (left <= 0) return null;

        const hours = Math.floor(left / (60 * 60 * 1000));
        const minutes = Math.floor((left % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">My Applications</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage and track your project applications</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 w-full sm:w-64 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                        {(['all', 'pending', 'accepted', 'rejected', 'withdrawn'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                                    filterStatus === status
                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                </div>
            ) : filteredApplications.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <FileText className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="text-zinc-500 font-medium">No applications found</p>
                    {filterStatus !== 'all' && (
                        <button onClick={() => setFilterStatus('all')} className="text-sm text-indigo-600 hover:underline mt-1">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredApplications.map((app) => (
                        <div key={app.id} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <Link href={`/projects/${app.project?.slug}`} className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                            {app.project?.title}
                                        </Link>
                                        {getStatusBadge(app.status)}
                                    </div>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2">
                                        Applied for <span className="font-medium text-zinc-800 dark:text-zinc-200">{app.role_applied_for}</span>
                                        <span className="mx-2">•</span>
                                        {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                    </p>

                                    {app.message && (
                                        <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                            <span className="font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Your message:</span>
                                            {app.message}
                                        </div>
                                    )}

                                    {app.rejection_message && (
                                        <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20 flex gap-2 items-start">
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <div>
                                                <span className="font-medium block mb-1">Feedback:</span>
                                                {app.rejection_message}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-2 pt-2 sm:pt-0">
                                    {app.status === 'pending' && (
                                        <button
                                            onClick={() => handleWithdraw(app)}
                                            disabled={!!processingId}
                                            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            {processingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Withdraw"}
                                        </button>
                                    )}

                                    {(app.status === 'rejected' || app.status === 'withdrawn') && (
                                        <div className="flex flex-col items-end gap-1">
                                            {isCooldownActive(app) ? (
                                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                                                    <RefreshCw className="w-3 h-3" />
                                                    Reapply in {getCooldownTimeLeft(app)}
                                                </div>
                                            ) : (
                                                <Link
                                                    href={`/projects/${app.project?.slug}`}
                                                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                                                >
                                                    Reapply
                                                </Link>
                                            )}
                                        </div>
                                    )}

                                    {app.conversation_id && (
                                        <Link
                                            href={`/messages?conversation=${app.conversation_id}`}
                                            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 underline underline-offset-4"
                                        >
                                            View Conversation
                                        </Link>
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
