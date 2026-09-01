"use client";

import { useMemo, useEffect, useState, useCallback, memo, forwardRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { sendConnectionRequest } from "@/app/actions/connection";
import { useToast } from "@/components/ui-custom/Toast";
import MyConnectionsModal from "./MyConnectionsModal";
// removed DiscoverModules
import PersonBottomSheet from "./PersonBottomSheet";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { VirtuosoGrid } from "react-virtuoso";
import PersonCard from "./PersonCard"; // Ensure this is imported if used in itemContent

import { Connection } from "@/types/people";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { usePeople } from "@/hooks/usePeople";
// Hook provides its own Profile type, but we might have a conflict with local interface.
// Let's remove local interface if redundant or alias it.
import type { Profile } from "@/hooks/usePeople";

type ConnectionState = "none" | "pending_outgoing" | "pending_incoming" | "accepted";

interface PeopleClientProps {
    initialProfiles: Profile[];
    initialUser: any;
    initialFacetProjectTags: { label: string; count: number }[];
    initialFacetSkills: { label: string; count: number }[];
    initialFacetLocations: { label: string; count: number }[];
    profilesPromise?: Promise<any>;
    connectionsPromise?: Promise<any>;
    facetsPromise?: Promise<any>;
    embedded?: boolean;
}

const PeopleClient = memo(function PeopleClient({
    initialUser,
    initialFacetProjectTags,
    initialFacetSkills,
    initialFacetLocations,
    facetsPromise,
    embedded = false
}: PeopleClientProps) {
    const supabase = createSupabaseBrowserClient();
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const currentUserId = initialUser?.id || null;

    // Derived URL Params
    const query = searchParams?.get("q") || "";
    const selectedProjectTags = useMemo(() => searchParams?.get("tags")?.split("|").filter(Boolean) || [], [searchParams]);
    const selectedSkills = useMemo(() => searchParams?.get("skills")?.split("|").filter(Boolean) || [], [searchParams]);
    const selectedLocations = useMemo(() => searchParams?.get("location")?.split("|").filter(Boolean) || [], [searchParams]);
    const selectedOpenTo = useMemo(() => searchParams?.get("opento")?.split("|").filter(Boolean) || ["collaboration"], [searchParams]);

    // Use centralized hook for data fetching
    const {
        profiles,
        loading,
        loadMore,
        hasMore,
        loadingMore
    } = usePeople({
        initialUser: initialUser,
        searchQuery: query,
        locations: selectedLocations,
        skills: selectedSkills,
        projectTags: selectedProjectTags
    });

    // Removed Effects:
    // - setSearchQuery(query)
    // - setSelectedProjectTags(...)
    // - setSelectedSkills(...)
    // - setSelectedLocations(...)
    // State is now derived directly from URL via Props -> Hook Query Key


    // Connection logic remains similar but relies on store
    const [showConnectionsModal, setShowConnectionsModal] = useState(false);
    const [expandedProfile, setExpandedProfile] = useState<Profile | null>(null);
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const [filtersCollapsed] = useState(false);

    // Filter helpers
    const updateFilterParam = useCallback((key: string, values: string[]) => {
        const params = new URLSearchParams(searchParams?.toString());
        if (values.length > 0) {
            params.set(key, values.join("|"));
        } else {
            params.delete(key);
        }
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, [searchParams, pathname, router]);

    const handleClearAll = useCallback(() => {
        const params = new URLSearchParams();
        const currentTab = searchParams?.get("tab");
        if (currentTab) params.set("tab", currentTab);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, [router, pathname, searchParams]);


    // Available facets - Keeps existing logic for now (could be RPC too but low priority)
    const [facetProjectTags, setFacetProjectTags] = useState<{ label: string; count: number }[]>(initialFacetProjectTags);
    const [facetSkills, setFacetSkills] = useState<{ label: string; count: number }[]>(initialFacetSkills);
    const [facetLocations, setFacetLocations] = useState<{ label: string; count: number }[]>(initialFacetLocations);

    useEffect(() => {
        if (facetsPromise) {
            Promise.resolve(facetsPromise).then(({ projectTags, skills, locations }) => {
                setFacetProjectTags(projectTags || []);
                setFacetSkills(skills || []);
                setFacetLocations(locations || []);
            });
        }
    }, [facetsPromise]);

    // Initialize connection store
    useEffect(() => {
        if (currentUserId) {
            useConnectionStore.getState().initialize(currentUserId);
        }
    }, [currentUserId]);




    // Derived state from store (reactive to real-time events)
    const { getAllConnections } = useConnectionStore();
    const [allConnections, setAllConnections] = useState<Connection[]>([]);

    // Load all connections for connection map (lightweight - just IDs and status)
    useEffect(() => {
        let alive = true;

        if (!currentUserId) {
            setAllConnections([]);
            return () => {
                alive = false;
            };
        }

        getAllConnections(currentUserId)
            .then((res) => {
                if (!alive) return;
                setAllConnections(Array.isArray(res) ? res : []);
            })
            .catch(() => {
                if (!alive) return;
                setAllConnections([]);
            });

        return () => {
            alive = false;
        };
    }, [currentUserId, getAllConnections]);

    // Merge connections into a fast lookup map
    const connectionMap = useMemo(() => {
        const map: Record<string, ConnectionState> = {};
        const list = Array.isArray(allConnections) ? allConnections : [];
        list.forEach((c: any) => {
            const otherId = c.user_id === currentUserId ? c.connected_user_id : c.user_id;
            let status: ConnectionState = "none";
            if (c.status === "accepted") status = "accepted";
            else if (c.status === "pending") {
                status = c.user_id === currentUserId ? "pending_outgoing" : "pending_incoming";
            }
            map[otherId] = status;
        });
        return map;
    }, [allConnections, currentUserId]);




    const sendConnect = useCallback(async (targetId: string) => {
        if (!currentUserId) return;
        const state = connectionMap[targetId] || "none";
        const store = useConnectionStore.getState();

        // Optimistic update
        if (state === "none") {
            store.addOptimisticConnection({
                id: `opt-${Date.now()}`,
                user_id: currentUserId,
                connected_user_id: targetId,
                status: "pending",
                created_at: new Date().toISOString()
            } as Connection);
            // Update local connection map
            setAllConnections(prev => [...prev, {
                id: `opt-${Date.now()}`,
                user_id: currentUserId,
                connected_user_id: targetId,
                status: "pending",
                created_at: new Date().toISOString(),
                accepted_at: null,
            } as Connection]);
        } else if (state === "pending_outgoing") {
            // Find connection ID to remove
            const conn = allConnections.find(c =>
                (c.user_id === currentUserId && c.connected_user_id === targetId) ||
                (c.user_id === targetId && c.connected_user_id === currentUserId)
            );
            if (conn) {
                store.removeOptimisticConnection(conn.id);
                setAllConnections(prev => prev.filter(c => c.id !== conn.id));
            }
        } else if (state === "pending_incoming") {
            // Find connection ID to accept
            const conn = allConnections.find(c =>
                (c.user_id === currentUserId && c.connected_user_id === targetId) ||
                (c.user_id === targetId && c.connected_user_id === currentUserId)
            );
            if (conn) {
                store.updateOptimisticStatus(conn.id, "accepted");
                setAllConnections(prev => prev.map(c => 
                    c.id === conn.id ? { ...c, status: "accepted" as const, accepted_at: new Date().toISOString() } : c
                ));
            }
        }

        try {
            if (state === "none") {
                const { error } = await sendConnectionRequest(currentUserId, targetId);
                if (error) throw error;
                showToast("Connection request sent", "success");
            } else if (state === "pending_outgoing") {
                const { error } = await supabase
                    .from("connections")
                    .delete()
                    .eq("user_id", currentUserId)
                    .eq("connected_user_id", targetId)
                    .eq("status", "pending");
                if (error) throw error;
                showToast("Connection request cancelled", "info");
            } else if (state === "pending_incoming") {
                const { error } = await supabase
                    .from("connections")
                    .update({ status: "accepted" })
                    .eq("user_id", targetId)
                    .eq("connected_user_id", currentUserId)
                    .eq("status", "pending");
                if (error) throw error;
                showToast("Connection request accepted", "success");
            }
        } catch (error: any) {
            console.error("Connection error:", error);
            // Revert by re-fetching (simplest for now) or rollback
            showToast(error?.message || "Failed to update connection", "error");
            store.initialize(currentUserId);
        }
    }, [currentUserId, connectionMap, allConnections, showToast, supabase]);

    const declineIncoming = useCallback(async (targetId: string) => {
        if (!currentUserId) return;

        // Find connection ID to remove
        const store = useConnectionStore.getState();
        const conn = allConnections.find(c =>
            (c.user_id === currentUserId && c.connected_user_id === targetId) ||
            (c.user_id === targetId && c.connected_user_id === currentUserId)
        );
        if (conn) {
            store.removeOptimisticConnection(conn.id);
            setAllConnections(prev => prev.filter(c => c.id !== conn.id));
        }

        try {
            const { error } = await supabase
                .from("connections")
                .delete()
                .eq("user_id", targetId)
                .eq("connected_user_id", currentUserId)
                .eq("status", "pending");

            if (error) throw error;
            showToast("Request declined", "info");
        } catch (error: any) {
            console.error("Error declining request:", error);
            showToast("Failed to decline request", "error");
            // Refresh connections
            getAllConnections(currentUserId).then(setAllConnections);
        }
    }, [currentUserId, allConnections, showToast, supabase, getAllConnections]);

    const unfriend = useCallback(async (targetId: string) => {
        if (!currentUserId) return;
        if (!confirm("Are you sure you want to disconnect from this user?")) return;

        const store = useConnectionStore.getState();
        const conn = allConnections.find(c =>
            (c.user_id === currentUserId && c.connected_user_id === targetId) ||
            (c.user_id === targetId && c.connected_user_id === currentUserId)
        );
        if (conn) {
            store.removeOptimisticConnection(conn.id);
            setAllConnections(prev => prev.filter(c => c.id !== conn.id));
        }

        try {
            const { error } = await supabase
                .from("connections")
                .delete()
                .or(`user_id.eq.${currentUserId}, user_id.eq.${targetId} `)
                .or(`connected_user_id.eq.${currentUserId}, connected_user_id.eq.${targetId} `);

            if (error) throw error;
            showToast("Disconnected successfully", "success");
        } catch (error: any) {
            console.error("Error disconnecting:", error);
            showToast("Failed to disconnect", "error");
            store.initialize(currentUserId);
        }
    }, [currentUserId, allConnections, showToast, supabase, getAllConnections]);

    // Handle mobile card tap
    const handleMobileExpand = useCallback((profile: Profile) => {
        setExpandedProfile(profile);
        setShowBottomSheet(true);
    }, []);





    return (
        <div className={embedded ? "w-full" : "h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-900 dark:!bg-zinc-950"}>
            <div className={cn(
                "mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] gap-6",
                embedded ? "px-4 pt-6 pb-6" : "px-4 pt-6"
            )}>
                {/* Left Filters */}
                <aside className={cn("hidden lg:block pt-0 pr-2", filtersCollapsed && "lg:hidden")}>
                    <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide space-y-4 pb-10 px-2">

                        {/* Filter Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filters</h2>
                            {(selectedProjectTags.length > 0 || selectedSkills.length > 0 || selectedLocations.length > 0 || selectedOpenTo.length > 1) && (
                                <button
                                    onClick={handleClearAll}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Project Types */}
                        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm">
                            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Project Type</h3>
                            <div className="space-y-0.5">
                                {facetProjectTags.length === 0 ? (
                                    <div className="text-xs text-zinc-400 italic py-1">No types found</div>
                                ) : (
                                    facetProjectTags.map(t => (
                                        <label key={t.label} className="flex items-center justify-between group py-1.5 -mx-2 px-2 rounded-md hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <div className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                    selectedProjectTags.includes(t.label)
                                                        ? "bg-indigo-600 border-indigo-600"
                                                        : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 group-hover:border-zinc-400"
                                                )}>
                                                    {selectedProjectTags.includes(t.label) && (
                                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProjectTags.includes(t.label)}
                                                    onChange={(e) => {
                                                        const newTags = e.target.checked
                                                            ? [...selectedProjectTags, t.label]
                                                            : selectedProjectTags.filter(x => x !== t.label);
                                                        updateFilterParam("tags", newTags);
                                                    }}
                                                    className="hidden"
                                                />
                                                <span className={cn(
                                                    "text-sm truncate",
                                                    selectedProjectTags.includes(t.label) ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-600 dark:text-zinc-400"
                                                )}>
                                                    {t.label}
                                                </span>
                                            </div>
                                            <span className="text-xs text-zinc-400 group-hover:text-zinc-500">{t.count}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm">
                            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {facetSkills.slice(0, 16).map(s => {
                                    const isSelected = selectedSkills.includes(s.label);
                                    return (
                                        <button
                                            key={s.label}
                                            onClick={() => {
                                                const newSkills = isSelected
                                                    ? selectedSkills.filter(x => x !== s.label)
                                                    : [...selectedSkills, s.label];
                                                updateFilterParam("skills", newSkills);
                                            }}
                                            className={cn(
                                                "px-2.5 py-1 text-xs font-medium rounded-md transition-all border",
                                                isSelected
                                                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                                                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                            )}
                                        >
                                            {s.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Open To */}
                        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm">
                            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Open To</h3>
                            <div className="space-y-0.5">
                                {[
                                    { key: 'collaboration', label: 'Collaborate' },
                                    { key: 'mentorship', label: 'Mentorship' },
                                    { key: 'cofounder', label: 'Co-founder' }
                                ].map(item => (
                                    <label key={item.key} className="flex items-center gap-2.5 group py-1.5 -mx-2 px-2 rounded-md hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                                        <div className={cn(
                                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                            selectedOpenTo.includes(item.key)
                                                ? "bg-indigo-600 border-indigo-600"
                                                : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 group-hover:border-zinc-400"
                                        )}>
                                            {selectedOpenTo.includes(item.key) && (
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedOpenTo.includes(item.key)}
                                            onChange={(e) => {
                                                const newOpenTo = e.target.checked
                                                    ? [...selectedOpenTo, item.key]
                                                    : selectedOpenTo.filter(x => x !== item.key);
                                                updateFilterParam("opento", newOpenTo);
                                            }}
                                            className="hidden"
                                        />
                                        <span className={cn(
                                            "text-sm",
                                            selectedOpenTo.includes(item.key) ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-600 dark:text-zinc-400"
                                        )}>
                                            {item.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Locations */}
                        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm">
                            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Location</h3>
                            <div className="space-y-0.5">
                                {facetLocations.slice(0, 10).map(l => (
                                    <label key={l.label} className="flex items-center justify-between group py-1.5 -mx-2 px-2 rounded-md hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <div className={cn(
                                                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                selectedLocations.includes(l.label)
                                                    ? "bg-indigo-600 border-indigo-600"
                                                    : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 group-hover:border-zinc-400"
                                            )}>
                                                {selectedLocations.includes(l.label) && (
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedLocations.includes(l.label)}
                                                onChange={(e) => {
                                                    const newLocations = e.target.checked
                                                        ? [...selectedLocations, l.label]
                                                        : selectedLocations.filter(x => x !== l.label);
                                                    updateFilterParam("location", newLocations);
                                                }}
                                                className="hidden"
                                            />

                                            <span className={cn(
                                                "text-sm truncate",
                                                selectedLocations.includes(l.label) ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-600 dark:text-zinc-400"
                                            )}>
                                                {l.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-zinc-400 group-hover:text-zinc-500">{l.count}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className={embedded ? "w-full" : "min-h-screen"}>
                    {!embedded && (
                        <div className="pt-4 flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">People</h1>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Discover collaborators by project type and skills.</p>
                            </div>
                            <button
                                onClick={() => setShowConnectionsModal(true)}
                                className="px-4 py-2 text-sm rounded-lg border hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                            >
                                My Connections
                            </button>
                        </div>
                    )}

                    {/* Invitations Section (incoming) */}
                    {!embedded && (
                        <InvitationsSection
                            currentUserId={currentUserId}
                            onAccept={(id) => { sendConnect(id); }}
                            onIgnore={(id) => { declineIncoming(id); }}
                        />
                    )}

                    {/* Discover Modules (Virtualized Grid) */}
                    {(loading && profiles.length === 0) ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="animate-pulse rounded-xl border bg-white dark:bg-zinc-900 p-4">
                                    <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800 mx-auto mb-4" />
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mx-auto mb-2" />
                                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2 mx-auto" />
                                </div>
                            ))}
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border">
                            <div className="text-6xl mb-4">
                                {(query || selectedProjectTags.length > 0 || selectedSkills.length > 0 || selectedLocations.length > 0) ? '🔍' : '👋'}
                            </div>
                            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                {(query || selectedProjectTags.length > 0 || selectedSkills.length > 0 || selectedLocations.length > 0)
                                    ? "No people match your filters"
                                    : "No one here yet"}
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                {(query || selectedProjectTags.length > 0 || selectedSkills.length > 0 || selectedLocations.length > 0)
                                    ? "Try adjusting your search criteria or clearing filters to see more results."
                                    : "You're among the first! Invite friends to grow your network."}
                            </p>
                            {(query || selectedProjectTags.length > 0 || selectedSkills.length > 0 || selectedLocations.length > 0) && (
                                <button
                                    onClick={handleClearAll}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <VirtuosoGrid
                            useWindowScroll
                            data={profiles}
                            endReached={() => loadMore()}
                            components={{
                                List: forwardRef((props, ref) => (
                                    <div
                                        {...props}
                                        ref={ref}
                                        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 pb-8"
                                    />
                                )),
                                Item: forwardRef((props, ref) => (
                                    <div {...props} ref={ref} className="h-full" />
                                )),
                                Footer: () => (
                                    <div className="col-span-full py-8 text-center w-full">
                                        {loadingMore && <span className="text-zinc-400 text-sm">Loading more...</span>}
                                        {!hasMore && profiles.length > 50 && <span className="text-zinc-400 text-sm">No more profiles</span>}
                                    </div>
                                )
                            }}
                            itemContent={(_, profile) => (
                                <PersonCard
                                    key={profile.id}
                                    profile={profile}
                                    connectionState={connectionMap[profile.id] || "none"}
                                    onConnect={() => sendConnect(profile.id)}
                                    onAccept={() => sendConnect(profile.id)}
                                    onDecline={() => declineIncoming(profile.id)}
                                    onUnfriend={() => unfriend(profile.id)}
                                    onMobileExpand={() => handleMobileExpand(profile)}
                                    currentUserId={currentUserId}
                                    selectedProjectId={null}
                                />
                            )}
                        />
                    )}
                </div>
            </div>

            {/* My Connections Modal */}
            {currentUserId && (
                <MyConnectionsModal
                    isOpen={showConnectionsModal}
                    onClose={() => setShowConnectionsModal(false)}
                    userId={currentUserId}
                />
            )}

            {/* Mobile Bottom Sheet */}
            {expandedProfile && currentUserId && (
                <PersonBottomSheet
                    isOpen={showBottomSheet}
                    onClose={() => {
                        setShowBottomSheet(false);
                        setExpandedProfile(null);
                    }}
                    profile={expandedProfile}
                    connectionState={connectionMap[expandedProfile.id] || "none"}
                    currentUserId={currentUserId}
                    selectedProjectId={null}
                    onConnect={() => {
                        sendConnect(expandedProfile.id);
                        setShowBottomSheet(false);
                        setExpandedProfile(null);
                    }}
                    onAccept={() => {
                        sendConnect(expandedProfile.id);
                        setShowBottomSheet(false);
                        setExpandedProfile(null);
                    }}
                    onDecline={() => {
                        declineIncoming(expandedProfile.id);
                        setShowBottomSheet(false);
                        setExpandedProfile(null);
                    }}

                />
            )}
        </div>
    );
});

export default PeopleClient;

function InvitationsSection({ currentUserId, onAccept, onIgnore }: { currentUserId: string | null; onAccept: (id: string) => void; onIgnore: (id: string) => void; }) {
    const supabase = createSupabaseBrowserClient();
    const [incoming, setIncoming] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            if (!currentUserId) return setIncoming([]);
            const { data } = await supabase
                .from('connections')
                .select(`id, user_id, connected_user_id, status, created_at, profiles: user_id(full_name, username, avatar_url)`)
                .eq('connected_user_id', currentUserId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(6);
            setIncoming(data || []);
        })();
    }, [currentUserId]);

    if (!incoming || incoming.length === 0) return null;

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Invitations ({incoming.length})</h2>
                <Link href="/people/invitations" className="text-sm text-blue-600 hover:underline">See all</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                {incoming.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 rounded-xl border p-4 bg-white dark:bg-zinc-900">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-semibold flex items-center justify-center">
                            {(r.profiles?.full_name || r.profiles?.username || 'U').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{r.profiles?.full_name || r.profiles?.username || 'User'}</div>
                            {r.profiles?.username && <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">@{r.profiles?.username}</div>}
                            <div className="mt-2 flex items-center gap-2">
                                <button onClick={() => onAccept(r.user_id)} className="px-3 py-1.5 rounded-lg border text-sm bg-blue-600 text-white border-blue-600">Accept</button>
                                <button onClick={() => onIgnore(r.user_id)} className="px-3 py-1.5 rounded-lg border text-sm text-zinc-900 dark:text-zinc-100">Ignore</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


