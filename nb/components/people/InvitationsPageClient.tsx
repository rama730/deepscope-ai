"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, X, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { profileHref } from "@/lib/routing/identifiers";
import { useToast } from "@/components/ui-custom/Toast";
import SwipeableConnectionRequest from "./SwipeableConnectionRequest";

type TabType = "incoming" | "sent";

export default function InvitationsPageClient({ initialUser }: { initialUser: any }) {
    const supabase = createSupabaseBrowserClient();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>("incoming");
    const [incoming, setIncoming] = useState<any[]>([]);
    const [sent, setSent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadInvitations();
    }, [initialUser, activeTab]);

    // Real-time subscription
    useEffect(() => {
        if (!initialUser?.id) return;

        const channel = supabase
            .channel(`invitations-${initialUser.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "connections",
                    filter: `status=eq.pending`
                },
                () => {
                    loadInvitations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [initialUser?.id, supabase]);

    async function loadInvitations() {
        if (!initialUser) return;
        setLoading(true);
        try {
            // Load incoming requests
            const { data: incomingData, error: incomingError } = await supabase
                .from('connections')
                .select(`id, user_id, connected_user_id, status, created_at, profiles:user_id(full_name, username, avatar_url, bio)`)
                .eq('connected_user_id', initialUser.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (incomingError) throw incomingError;

            // Load sent requests
            const { data: sentData, error: sentError } = await supabase
                .from('connections')
                .select(`id, user_id, connected_user_id, status, created_at, connected_profiles:connected_user_id(full_name, username, avatar_url, bio)`)
                .eq('user_id', initialUser.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (sentError) throw sentError;

            setIncoming(incomingData || []);
            setSent(sentData || []);
        } catch (error) {
            console.error("Error loading invitations:", error);
            showToast("Failed to load invitations", "error");
        } finally {
            setLoading(false);
        }
    }

    async function handleAccept(connectionId: string) {
        setProcessingIds(prev => new Set(prev).add(connectionId));
        const previousIncoming = [...incoming];

        // Optimistic update
        setIncoming(prev => prev.filter(i => i.id !== connectionId));

        try {
            const { error } = await supabase
                .from("connections")
                .update({ status: "accepted" })
                .eq("id", connectionId)
                .eq("status", "pending");

            if (error) throw error;
            showToast("Connection request accepted", "success");
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(connectionId);
                return next;
            });
        } catch (error) {
            console.error("Error accepting request:", error);
            showToast("Failed to accept request", "error");
            setIncoming(previousIncoming);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(connectionId);
                return next;
            });
        }
    }

    async function handleIgnore(connectionId: string) {
        setProcessingIds(prev => new Set(prev).add(connectionId));
        const previousIncoming = [...incoming];

        // Optimistic update
        setIncoming(prev => prev.filter(i => i.id !== connectionId));

        try {
            const { error } = await supabase
                .from("connections")
                .delete()
                .eq("id", connectionId);

            if (error) throw error;
            showToast("Request ignored", "info");
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(connectionId);
                return next;
            });
        } catch (error) {
            console.error("Error ignoring request:", error);
            showToast("Failed to ignore request", "error");
            setIncoming(previousIncoming);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(connectionId);
                return next;
            });
        }
    }

    async function handleCancel(connectionId: string) {
        setProcessingIds(prev => new Set(prev).add(connectionId));
        const previousSent = [...sent];

        // Optimistic update
        setSent(prev => prev.filter(i => i.id !== connectionId));

        try {
            const { error } = await supabase
                .from("connections")
                .delete()
                .eq("id", connectionId);

            if (error) throw error;
            showToast("Request cancelled", "success");
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(connectionId);
                return next;
            });
        } catch (error) {
            console.error("Error cancelling request:", error);
            showToast("Failed to cancel request", "error");
            setSent(previousSent);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(connectionId);
                return next;
            });
        }
    }

    async function handleBulkAccept() {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        setProcessingIds(new Set(ids));

        try {
            const { error } = await supabase
                .from("connections")
                .update({ status: "accepted" })
                .in("id", ids)
                .eq("status", "pending");

            if (error) throw error;
            showToast(`Accepted ${ids.length} request${ids.length > 1 ? 's' : ''}`, "success");
            setSelectedIds(new Set());
            loadInvitations();
        } catch (error) {
            console.error("Error accepting requests:", error);
            showToast("Failed to accept requests", "error");
        } finally {
            setProcessingIds(new Set());
        }
    }

    async function handleBulkIgnore() {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        setProcessingIds(new Set(ids));

        try {
            const { error } = await supabase
                .from("connections")
                .delete()
                .in("id", ids);

            if (error) throw error;
            showToast(`Ignored ${ids.length} request${ids.length > 1 ? 's' : ''}`, "info");
            setSelectedIds(new Set());
            loadInvitations();
        } catch (error) {
            console.error("Error ignoring requests:", error);
            showToast("Failed to ignore requests", "error");
        } finally {
            setProcessingIds(new Set());
        }
    }

    async function handleBulkCancel() {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        setProcessingIds(new Set(ids));

        try {
            const { error } = await supabase
                .from("connections")
                .delete()
                .in("id", ids);

            if (error) throw error;
            showToast(`Cancelled ${ids.length} request${ids.length > 1 ? 's' : ''}`, "success");
            setSelectedIds(new Set());
            loadInvitations();
        } catch (error) {
            console.error("Error cancelling requests:", error);
            showToast("Failed to cancel requests", "error");
        } finally {
            setProcessingIds(new Set());
        }
    }

    function toggleSelection(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function selectAll() {
        const currentList = activeTab === "incoming" ? incoming : sent;
        if (selectedIds.size === currentList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(currentList.map((r: any) => r.id)));
        }
    }

    const currentList = activeTab === "incoming" ? incoming : sent;
    const hasSelections = selectedIds.size > 0;
    const isProcessing = processingIds.size > 0;

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-48" />
                    <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/people" className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold">Connection Requests</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={() => {
                        setActiveTab("incoming");
                        setSelectedIds(new Set());
                    }}
                    className={`px-4 py-2 font-medium transition-colors relative ${activeTab === "incoming"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 dark:hover:text-zinc-100"
                        }`}
                >
                    Incoming ({incoming.length})
                    {activeTab === "incoming" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                    )}
                </button>
                <button
                    onClick={() => {
                        setActiveTab("sent");
                        setSelectedIds(new Set());
                    }}
                    className={`px-4 py-2 font-medium transition-colors relative ${activeTab === "sent"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 dark:hover:text-zinc-100"
                        }`}
                >
                    Sent ({sent.length})
                    {activeTab === "sent" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                    )}
                </button>
            </div>

            {/* Bulk Actions */}
            {hasSelections && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {selectedIds.size} selected
                    </span>
                    <div className="flex gap-2">
                        {activeTab === "incoming" ? (
                            <>
                                <button
                                    onClick={handleBulkAccept}
                                    disabled={isProcessing}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    Accept All
                                </button>
                                <button
                                    onClick={handleBulkIgnore}
                                    disabled={isProcessing}
                                    className="px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                                >
                                    Ignore All
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleBulkCancel}
                                disabled={isProcessing}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                Cancel All
                            </button>
                        )}
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            {currentList.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <Clock className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                    <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                        No {activeTab === "incoming" ? "incoming" : "sent"} requests.
                    </p>
                    {activeTab === "sent" && (
                        <Link href="/people" className="text-blue-600 hover:underline">
                            Discover people to connect with
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Select All */}
                    <div className="flex items-center gap-2 pb-2">
                        <input
                            type="checkbox"
                            checked={selectedIds.size === currentList.length && currentList.length > 0}
                            onChange={selectAll}
                            className="rounded border-zinc-300 dark:border-zinc-700"
                        />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Select all</span>
                    </div>

                    {currentList.map((r) => {
                        const profile = activeTab === "incoming" ? r.profiles : r.connected_profiles;
                        const isSelected = selectedIds.has(r.id);
                        const isProcessingItem = processingIds.has(r.id);
                        const requestAge = formatDistanceToNow(new Date(r.created_at), { addSuffix: true });
                        const daysSince = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24));

                        return (
                            <SwipeableConnectionRequest
                                key={r.id}
                                onAccept={activeTab === "incoming" ? () => handleAccept(r.id) : undefined}
                                onDecline={activeTab === "incoming" ? () => handleIgnore(r.id) : undefined}
                                onCancel={activeTab === "sent" ? () => handleCancel(r.id) : undefined}
                                actionType={activeTab === "incoming" ? "accept/decline" : "cancel"}
                                disabled={isProcessingItem}
                            >
                                <div
                                    className={`flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border transition-all ${isSelected
                                        ? "border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                                        : "border-zinc-200 dark:border-zinc-800"
                                        } ${isProcessingItem ? "opacity-50" : ""}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelection(r.id)}
                                        className="mt-2 rounded border-zinc-300 dark:border-zinc-700"
                                        disabled={isProcessingItem}
                                    />
                                    <Link
                                        href={profileHref(profile?.username || profile?.id || r.user_id || r.connected_user_id)}
                                        className="flex-shrink-0"
                                    >
                                        {profile?.avatar_url ? (
                                            <Image
                                                src={profile.avatar_url}
                                                alt=""
                                                width={48}
                                                height={48}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                                                {(profile?.full_name || profile?.username || 'U')[0].toUpperCase()}
                                            </div>
                                        )}
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <Link
                                                    href={profileHref(profile?.username || profile?.id || r.user_id || r.connected_user_id)}
                                                    className="font-semibold hover:underline text-lg"
                                                >
                                                    {profile?.full_name || profile?.username || 'User'}
                                                </Link>
                                                {profile?.username && (
                                                    <p className="text-sm text-zinc-500">@{profile.username}</p>
                                                )}
                                                {profile?.bio && (
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                                                        {profile.bio}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <p className="text-xs text-zinc-400">
                                                        {requestAge}
                                                    </p>
                                                    {daysSince > 30 && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                                            Old
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-4">
                                            {activeTab === "incoming" ? (
                                                <>
                                                    <button
                                                        onClick={() => handleAccept(r.id)}
                                                        disabled={isProcessingItem}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleIgnore(r.id)}
                                                        disabled={isProcessingItem}
                                                        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                                                    >
                                                        Ignore
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleCancel(r.id)}
                                                    disabled={isProcessingItem}
                                                    className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors flex items-center gap-2"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Cancel Request
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </SwipeableConnectionRequest>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
