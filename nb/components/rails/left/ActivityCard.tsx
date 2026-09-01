"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useProfileStats } from "@/hooks/useRailQueries";
import { logger } from "@/lib/logger";
import {
    FolderKanban, Bell, Bookmark, ChevronRight, Check, X, Share2, Lightbulb
} from "lucide-react";
import { profileHref } from "@/lib/routing/identifiers";
import ShareCollectionModal from "@/components/explorer/ShareCollectionModal";
import { useQueryClient } from "@tanstack/react-query";

type ActivityTab = "projects" | "pending" | "saved";

export default function ActivityCard({ userId }: { userId: string }) {
    const [activeTab, setActiveTab] = useState<ActivityTab>("projects");
    const [pendingPulse, setPendingPulse] = useState(false);
    const [tabLoading, setTabLoading] = useState<Record<ActivityTab, boolean>>({
        projects: false,
        pending: false,
        saved: false,
    });

    const supabase = createSupabaseBrowserClient();
    const queryClient = useQueryClient();
    const prevPendingCount = useRef(0);

    // Use the cached query for counts
    const { data: stats } = useProfileStats(userId);
    const counts = stats?.counts || { projects: 0, pending: 0, saved: 0 };

    useEffect(() => {
        const newPendingCount = counts.pending || 0;
        // Trigger pulse animation if new pending requests
        if (newPendingCount > prevPendingCount.current && prevPendingCount.current > 0) {
            setPendingPulse(true);
            setTimeout(() => setPendingPulse(false), 2000);
        }
        prevPendingCount.current = newPendingCount;
    }, [counts.pending]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "1") setActiveTab("projects");
            if (e.key === "2") setActiveTab("pending");
            if (e.key === "3") setActiveTab("saved");
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const tabs: { id: ActivityTab; label: string; icon: React.ReactNode; count: number }[] = [
        { id: "projects", label: "Projects", icon: <FolderKanban className="h-3 w-3" />, count: counts.projects },
        { id: "pending", label: "Pending", icon: <Bell className="h-3 w-3" />, count: counts.pending },
        { id: "saved", label: "Saved", icon: <Bookmark className="h-3 w-3" />, count: counts.saved },
    ];

    return (
        <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Tab Headers - Compact */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium transition-all relative ${activeTab === tab.id
                            ? "text-zinc-900 dark:text-white"
                            : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            } `}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                            <span className={`ml-0.5 px-1 py-0 text-[9px] rounded-full ${activeTab === tab.id
                                ? "bg-blue-500 text-white"
                                : "bg-zinc-300 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                } ${tab.id === "pending" && pendingPulse ? "animate-pulse bg-green-500" : ""} `}>
                                {tab.count}
                            </span>
                        )}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content - Compact */}
            <div className="p-2 relative">
                {activeTab === "projects" && <ProjectsTabContent userId={userId} setLoading={(loading) => setTabLoading(prev => ({ ...prev, projects: loading }))} />}
                {activeTab === "pending" && <PendingTabContent userId={userId} setLoading={(loading) => setTabLoading(prev => ({ ...prev, pending: loading }))} />}
                {activeTab === "saved" && <SavedTabContent userId={userId} setLoading={(loading) => setTabLoading(prev => ({ ...prev, saved: loading }))} />}
                {tabLoading[activeTab] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-b-xl z-10">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ... Subcomponents ...
function LoadingPlaceholder() {
    return (
        <div className="space-y-1.5">
            <div className="h-8 bg-zinc-300 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-8 bg-zinc-300 dark:bg-zinc-800 rounded-lg animate-pulse" />
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
        open: { bg: "bg-green-100 dark:bg-green-500/20", text: "text-green-700 dark:text-green-400", dot: "bg-green-500 dark:bg-green-400" },
        "in-progress": { bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500 dark:bg-blue-400" },
        completed: { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-700 dark:text-zinc-200", dot: "bg-zinc-500 dark:bg-zinc-300" },
        paused: { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500 dark:bg-amber-400" },
    };

    const config = statusConfig[status] || { bg: "bg-zinc-100 dark:bg-zinc-700", text: "text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-400 dark:bg-zinc-400" };

    return (
        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {status}
        </span>
    );
}

function ProjectsTabContent({ userId, setLoading }: { userId: string; setLoading?: (loading: boolean) => void }) {
    const supabase = createSupabaseBrowserClient();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoadingState] = useState(true);

    const updateLoading = (state: boolean) => {
        setLoadingState(state);
        setLoading?.(state);
    };

    useEffect(() => {
        (async () => {
            // Get projects user created
            const { data: createdProjects } = await supabase
                .from("projects")
                .select("id, title, status, slug")
                .eq("creator_id", userId)
                .order("created_at", { ascending: false })
                .limit(3);

            // Get projects user is a collaborator on
            const { data: collaborations } = await supabase
                .from("project_collaborators")
                .select("project_id, projects:project_id(id, title, status, slug)")
                .eq("user_id", userId)
                .limit(3);

            const collabProjects = collaborations?.map(c => c.projects).filter(Boolean) || [];

            // Combine and dedupe (in case user is both creator and collaborator)
            const createdIds = new Set((createdProjects || []).map(p => p.id));
            const uniqueCollabProjects = collabProjects.filter((p: any) => !createdIds.has(p.id));
            const allProjects = [...(createdProjects || []), ...uniqueCollabProjects].slice(0, 3);

            setProjects(allProjects);
            updateLoading(false);
        })();
    }, [userId]);

    if (loading) return <LoadingPlaceholder />;

    if (projects.length === 0) {
        return (
            <div className="text-center py-4">
                <FolderKanban className="h-5 w-5 text-zinc-400 dark:text-zinc-600 mx-auto mb-1.5" />
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">No projects yet</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                    <Link href="/hub" className="text-blue-600 dark:text-blue-400 hover:underline">Create</Link>
                    {" or "}
                    <Link href="/explorer" className="text-blue-600 dark:text-blue-400 hover:underline">join a project</Link>
                    {" in the Hub"}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            {projects.map((project) => (
                <Link
                    key={project.id}
                    href={`/projects/${project.slug || project.id}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-colors group"
                >
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1 group-hover:text-zinc-900 dark:group-hover:text-white">
                        {project.title}
                    </span>
                    <StatusBadge status={project.status} />
                </Link>
            ))}
            <Link
                href="/hub"
                className="flex items-center justify-center gap-1 py-1.5 text-[10px] text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
                View all
                <ChevronRight className="h-2.5 w-2.5" />
            </Link>
        </div>
    );
}

function PendingTabContent({ userId, setLoading }: { userId: string; setLoading?: (loading: boolean) => void }) {
    const supabase = createSupabaseBrowserClient();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoadingState] = useState(true);
    const queryClient = useQueryClient();

    const updateLoading = (state: boolean) => {
        setLoadingState(state);
        setLoading?.(state);
    };

    const loadRequests = async () => {
        updateLoading(true);
        try {
            const { data } = await supabase
                .from("connections")
                .select(`id, user_id, profiles:user_id(full_name, username, avatar_url)`)
                .eq("connected_user_id", userId)
                .eq("status", "pending")
                .order("created_at", { ascending: false })
                .limit(3);
            setRequests(data || []);
        } catch (error) {
            logger.error("Error loading pending requests", { error });
        } finally {
            updateLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();

        // Real-time subscription for this specific tab
        const channel = supabase
            .channel(`pending-tab-${userId}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "connections",
                filter: `connected_user_id = eq.${userId}`,
            }, () => {
                loadRequests();
                queryClient.invalidateQueries({ queryKey: ["rail", "stats", userId] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    async function handleRequest(id: string, accept: boolean) {
        const previousRequests = [...requests];
        // Optimistic update
        setRequests((prev) => prev.filter((r) => r.id !== id));

        try {
            const { error } = await supabase
                .from("connections")
                .update({ status: accept ? "accepted" : "rejected" })
                .eq("id", id);

            if (error) throw error;

            // Invalidate global stats
            queryClient.invalidateQueries({ queryKey: ["rail", "stats", userId] });
        } catch (error) {
            logger.error("Error handling request", { error });
            // Revert on error
            setRequests(previousRequests);
        }
    }

    if (loading) return <LoadingPlaceholder />;

    if (requests.length === 0) {
        return (
            <div className="text-center py-4">
                <Bell className="h-5 w-5 text-zinc-400 dark:text-zinc-600 mx-auto mb-1.5" />
                <p className="text-xs text-zinc-500 dark:text-zinc-500">No pending requests</p>
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            {requests.map((req) => (
                <div
                    key={req.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50"
                >
                    <Link
                        href={profileHref({ id: req.user_id, username: req.profiles?.username })}
                        className="flex items-center gap-2 flex-1 min-w-0 group"
                    >
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0 overflow-hidden">
                            {req.profiles?.avatar_url ? (
                                <Image
                                    src={req.profiles.avatar_url}
                                    alt=""
                                    width={24}
                                    height={24}
                                    className="rounded-full object-cover"
                                />
                            ) : (
                                (req.profiles?.full_name || req.profiles?.username || "U").slice(0, 1).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {req.profiles?.full_name || req.profiles?.username || "User"}
                            </p>
                        </div>
                    </Link>
                    <div className="flex gap-0.5">
                        <button
                            onClick={() => handleRequest(req.id, true)}
                            className="p-1 rounded bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors"
                            title="Accept"
                        >
                            <Check className="h-3 w-3" />
                        </button>
                        <button
                            onClick={() => handleRequest(req.id, false)}
                            className="p-1 rounded bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                            title="Decline"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            ))}
            <Link
                href="/people"
                className="flex items-center justify-center gap-1 py-1.5 text-[10px] text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
                Manage
                <ChevronRight className="h-2.5 w-2.5" />
            </Link>
        </div>
    );
}

function SavedTabContent({ userId, setLoading }: { userId: string; setLoading?: (loading: boolean) => void }) {
    const supabase = createSupabaseBrowserClient();
    const [items, setItems] = useState<any[]>([]);
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoadingState] = useState(true);
    const [sharingCollection, setSharingCollection] = useState<any>(null);

    const updateLoading = (state: boolean) => {
        setLoadingState(state);
        setLoading?.(state);
    };

    useEffect(() => {
        (async () => {
            // Fetch Bookmarks
            const { data: bookmarks } = await supabase
                .from("bookmarks")
                .select("entity_id, entity_type")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(3);

            // Fetch Collections
            const { data: userCollections } = await supabase
                .from("collections")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(3);

            setCollections(userCollections || []);

            if (!bookmarks || bookmarks.length === 0) {
                setItems([]);
                updateLoading(false);
                return;
            }

            const projectIds = bookmarks.filter((b) => b.entity_type === "project").map((b) => b.entity_id);
            const postIds = bookmarks.filter((b) => b.entity_type === "post").map((b) => b.entity_id);

            const [{ data: projects }, { data: posts }] = await Promise.all([
                projectIds.length > 0
                    ? supabase.from("projects").select("id, title, slug").in("id", projectIds)
                    : Promise.resolve({ data: [] }),
                postIds.length > 0
                    ? supabase.from("posts").select("id, content").in("id", postIds)
                    : Promise.resolve({ data: [] }),
            ]);

            const enriched = bookmarks.map((b) => {
                if (b.entity_type === "project") {
                    const project = projects?.find((p) => p.id === b.entity_id);
                    return { type: "project", id: b.entity_id, title: project?.title || "Untitled", href: `/projects/${(project as any)?.slug || b.entity_id}` };
                } else if (b.entity_type === "post") {
                    const post = posts?.find((p) => p.id === b.entity_id);
                    return { type: "post", id: b.entity_id, title: post?.content?.slice(0, 30) || "Untitled", href: `/post/${b.entity_id}` };
                }
                return null;
            }).filter(Boolean);

            setItems(enriched);
            updateLoading(false);
        })();
    }, [userId]);

    if (loading) return <LoadingPlaceholder />;

    if (items.length === 0 && collections.length === 0) {
        return (
            <div className="text-center py-4">
                <Bookmark className="h-5 w-5 text-zinc-400 dark:text-zinc-600 mx-auto mb-1.5" />
                <p className="text-xs text-zinc-500 dark:text-zinc-500">No saved items</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Collections Section */}
            {collections.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500 px-1">Collections</div>
                    {collections.map((collection) => (
                        <div
                            key={collection.id}
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-colors group"
                        >
                            <div className="p-1 rounded bg-indigo-100 dark:bg-indigo-500/20">
                                <FolderKanban className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <Link href={`/hub?collection=${collection.id}`} className="text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1 group-hover:text-zinc-900 dark:group-hover:text-white">
                                {collection.name}
                            </Link>
                            <button
                                onClick={() => setSharingCollection(collection)}
                                className="p-1 rounded hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Share collection"
                            >
                                <Share2 className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Bookmarks Section */}
            {items.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500 px-1">Recent Saves</div>
                    {items.map((item: any) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-colors group"
                        >
                            <div className={`p-1 rounded ${item.type === "project" ? "bg-purple-100 dark:bg-purple-500/20" : "bg-blue-100 dark:bg-blue-500/20"}`}>
                                {item.type === "project" ? (
                                    <FolderKanban className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                ) : (
                                    <Lightbulb className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                )}
                            </div>
                            <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1 group-hover:text-zinc-900 dark:group-hover:text-white">{item.title}</span>
                        </Link>
                    ))}
                </div>
            )}

            {sharingCollection && (
                <ShareCollectionModal
                    collection={sharingCollection}
                    onClose={() => setSharingCollection(null)}
                />
            )}
        </div>
    );
}
