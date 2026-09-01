"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import {
    Search,
    X,
    Compass,
    LayoutGrid,
    Users,
    MessageSquare,
    CheckSquare,
    History
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useDebounce } from "@/hooks/useDebounce";
import { Highlight } from "@/components/ui-custom/Highlight";
import { profileHref, projectHref } from "@/lib/routing/identifiers";
import { useAuth } from "@/hooks/useAuth";
import { MessagingService } from "@/lib/services/messaging/index";

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    initialQuery?: string;
    context?: string;
}

export default function CommandPalette({ isOpen, onClose, initialQuery = "", context = "default" }: CommandPaletteProps) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createSupabaseBrowserClient();
    const { user } = useAuth();

    const [query, setQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<"all" | "projects" | "people" | "posts" | "messages">(context === "messages" ? "messages" : "all");
    const [results, setResults] = useState<any[]>([]);
    const [projectTaskResults, setProjectTaskResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]); // Autocomplete suggestions
    const { recentSearches, addSearch } = useSearchHistory();

    // Context-specific state
    const [trendingTags, setTrendingTags] = useState<string[]>([]);
    const [suggestedPeople, setSuggestedPeople] = useState<any[]>([]);
    const [recentProjects, setRecentProjects] = useState<any[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Recent searches are now handled by useSearchHistory hook

    // Update query when initialQuery changes and fetch context data
    useEffect(() => {
        if (isOpen) {
            setQuery(initialQuery);
            // If opening with a context, pre-fetch context specific data
            if (context === "explorer") fetchTrendingTags();
            if (context === "people") fetchSuggestedPeople();
            if (context === "hub" || context === "project") fetchRecentProjects();
        }
    }, [isOpen, initialQuery, context]);

    // Resolve the current project id (for project-scoped task boosting).
    useEffect(() => {
        if (!isOpen || context !== "project") {
            setActiveProjectId(null);
            return;
        }

        const raw = (pathname || "").split("/projects/")[1]?.split("/")[0] || null;
        if (!raw) {
            setActiveProjectId(null);
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(raw)) {
            setActiveProjectId(raw);
            return;
        }

        let cancelled = false;
        (async () => {
            const { data } = await supabase.from("projects").select("id").eq("slug", raw).maybeSingle();
            if (cancelled) return;
            setActiveProjectId((data as any)?.id || null);
        })();

        return () => {
            cancelled = true;
        };
        // Intentionally not depending on supabase client instance
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, context, pathname]);

    // Load context data functions
    async function fetchTrendingTags() {
        try {
            // Fetch actual trending hashtags from posts
            const { data: posts } = await supabase
                .from("posts")
                .select("tags, content")
                .not("tags", "is", null)
                .order("created_at", { ascending: false })
                .limit(100);

            if (posts) {
                const tagCounts: Record<string, number> = {};

                posts.forEach((post: any) => {
                    // Count tags from tags array
                    if (post.tags && Array.isArray(post.tags)) {
                        post.tags.forEach((tag: string) => {
                            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                        });
                    }

                    // Extract hashtags from content
                    const hashtagRegex = /#([\w]+)/g;
                    const matches = post.content?.match(hashtagRegex);
                    if (matches) {
                        matches.forEach((match: string) => {
                            const tag = match.slice(1); // Remove #
                            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                        });
                    }
                });

                // Sort by count and get top 5
                const sortedTags = Object.entries(tagCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([tag]) => `#${tag}`);

                setTrendingTags(sortedTags.length > 0 ? sortedTags : ["#frontend", "#design", "#react", "#ui/ux", "#startup"]);
            } else {
                setTrendingTags(["#frontend", "#design", "#react", "#ui/ux", "#startup"]);
            }
        } catch (error) {
            console.error("Error fetching trending tags:", error);
            setTrendingTags(["#frontend", "#design", "#react", "#ui/ux", "#startup"]);
        }
    }

    async function fetchSuggestedPeople() {
        const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').limit(5);
        if (data) setSuggestedPeople(data);
    }

    async function fetchRecentProjects() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('projects').select('id, title, slug').eq('creator_id', user.id).order('updated_at', { ascending: false }).limit(5);
        if (data) setRecentProjects(data.map((p: any) => ({ ...p, name: p.title, emoji: "📁" })));
    }

    // Effect to handle keyboard shortcut (Cmd+K) & Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Search history is handled by useSearchHistory hook

    const debouncedQuery = useDebounce(query, 300);

    // Fetch autocomplete suggestions (for hub and explorer contexts)
    useEffect(() => {
        if ((context !== "hub" && context !== "explorer") || !debouncedQuery.trim() || debouncedQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        const fetchSuggestions = async () => {
            try {
                if (context === "hub") {
                    const { data } = await supabase
                        .from("projects")
                        .select("title, tags, technologies_used")
                        .or(`title.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%`)
                        .limit(5);

                    if (data) {
                        const uniqueSuggestions = new Set<string>();
                        data.forEach((project: any) => {
                            if (project.title?.toLowerCase().includes(debouncedQuery.toLowerCase())) {
                                uniqueSuggestions.add(project.title);
                            }
                            project.tags?.forEach((tag: string) => {
                                if (tag.toLowerCase().includes(debouncedQuery.toLowerCase())) {
                                    uniqueSuggestions.add(tag);
                                }
                            });
                            project.technologies_used?.forEach((tech: string) => {
                                if (tech.toLowerCase().includes(debouncedQuery.toLowerCase())) {
                                    uniqueSuggestions.add(tech);
                                }
                            });
                        });
                        setSuggestions(Array.from(uniqueSuggestions).slice(0, 5));
                    }
                } else if (context === "explorer") {
                    // Explorer-specific suggestions: hashtags, people, topics
                    const uniqueSuggestions = new Set<string>();

                    // Fetch trending hashtags
                    const { data: postsWithTags } = await supabase
                        .from("posts")
                        .select("tags, content")
                        .not("tags", "is", null)
                        .ilike("content", `%${debouncedQuery}%`)
                        .limit(10);

                    if (postsWithTags) {
                        postsWithTags.forEach((post: any) => {
                            if (post.tags && Array.isArray(post.tags)) {
                                post.tags.forEach((tag: string) => {
                                    if (tag.toLowerCase().includes(debouncedQuery.toLowerCase())) {
                                        uniqueSuggestions.add(`#${tag}`);
                                    }
                                });
                            }
                            // Extract hashtags from content
                            const hashtagRegex = /#[\w]+/g;
                            const matches = post.content?.match(hashtagRegex);
                            if (matches) {
                                matches.forEach((tag: string) => {
                                    if (tag.toLowerCase().includes(debouncedQuery.toLowerCase())) {
                                        uniqueSuggestions.add(tag);
                                    }
                                });
                            }
                        });
                    }

                    // Fetch people suggestions
                    const { data: people } = await supabase
                        .from("profiles")
                        .select("username, full_name")
                        .or(`username.ilike.%${debouncedQuery}%,full_name.ilike.%${debouncedQuery}%`)
                        .limit(3);

                    if (people) {
                        people.forEach((person: any) => {
                            uniqueSuggestions.add(`@${person.username}`);
                        });
                    }

                    setSuggestions(Array.from(uniqueSuggestions).slice(0, 5));
                }
            } catch (error) {
                console.error("Error fetching suggestions:", error);
            }
        };

        fetchSuggestions();
    }, [debouncedQuery, context, supabase]);

    // Search function (API Based or Message Search)
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([]);
            setProjectTaskResults([]);
            return;
        }

        const performSearch = async () => {
            setLoading(true);
            try {
                // Project-boosted tasks (shown above global results).
                if (context === "project" && activeTab === "all" && activeProjectId) {
                    const q = debouncedQuery.trim();
                    const { data } = await supabase
                        .from("project_tasks")
                        .select("id, title, description, status, priority")
                        .eq("project_id", activeProjectId)
                        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
                        .limit(8);

                    setProjectTaskResults(
                        (data || []).map((t: any) => ({
                            ...t,
                            type: "task",
                            projectId: activeProjectId,
                        }))
                    );
                } else {
                    setProjectTaskResults([]);
                }

                // Handle message search separately
                if (context === "messages" && user && (activeTab === "messages" || activeTab === "all")) {
                    const messageResults = await MessagingService.searchMessages(
                        user.id,
                        debouncedQuery,
                        { limit: 20 }
                    );

                    const formattedResults = messageResults.map((msg: any) => ({
                        id: msg.id,
                        type: "message",
                        title: msg.content.substring(0, 80) + (msg.content.length > 80 ? "..." : ""),
                        subtitle: `${msg.conversation_type === 'group' ? 'Group' : msg.conversation_type === 'project' ? 'Project' : 'Direct'} chat with ${msg.conversation_name || 'Unknown'}`,
                        sender: msg.sender_name,
                        conversationId: msg.conversation_id,
                        conversationName: msg.conversation_name,
                        conversationType: msg.conversation_type,
                        createdAt: msg.created_at,
                        url: `/messages?conversation=${msg.conversation_id}&message=${msg.id}`
                    }));

                    // If activeTab is "all", combine with other results, otherwise show only messages
                    if (activeTab === "all") {
                        // Also fetch other results
                        const searchType = "all";
                        const response = await fetch(`/api/v1/search?q=${encodeURIComponent(debouncedQuery)}&type=${searchType}`);
                        const result = await response.json();
                        const otherResults = result.success ? result.data : [];
                        setResults([...formattedResults, ...otherResults]);
                    } else {
                        setResults(formattedResults);
                    }
                } else {
                    // Regular search
                    const searchType = activeTab === "all" ? "all" : activeTab;
                    const response = await fetch(`/api/v1/search?q=${encodeURIComponent(debouncedQuery)}&type=${searchType}`);
                    const result = await response.json();

                    if (result.success) {
                        setResults(result.data);
                    } else {
                        console.error("Search API failed:", result.error);
                        setResults([]);
                    }
                }
            } catch (error) {
                console.error("Search error:", error);
                setResults([]);
                setProjectTaskResults([]);
            } finally {
                setLoading(false);
            }
        };

        performSearch();
    }, [debouncedQuery, activeTab, context, user, activeProjectId]);


    const handleSelect = (item: any) => {
        if (item.type === "history") {
            setQuery(item.term);
            return;
        }

        if (item.term) { // It's a history item clicked
            setQuery(item.term);
            return;
        }

        // Handle suggestion selection (for hub context)
        if (typeof item === 'string' && context === "hub") {
            addSearch(item);
            onClose();
            // Update Hub URL with search query
            router.push(`/hub?q=${encodeURIComponent(item)}`);
            return;
        }

        const searchTerm = query || (typeof item === 'string' ? item : "") || "";
        if (searchTerm) {
            addSearch(searchTerm);
        }

        // For hub context, if searching projects, update URL instead of navigating
        if (context === "hub" && item.type === "project") {
            const searchTerm = query || item.name || "";
            if (searchTerm) addSearch(searchTerm);
            onClose();
            router.push(`/hub?q=${encodeURIComponent(searchTerm)}`);
            return;
        }

        // For hub context, if just searching (Enter key), update URL
        if (context === "hub" && query.trim() && (!item.type || item.type === "search")) {
            addSearch(query);
            onClose();
            router.push(`/hub?q=${encodeURIComponent(query)}`);
            return;
        }

        // For explorer context, if just searching (Enter key), update URL
        if (context === "explorer" && query.trim() && (!item.type || item.type === "search")) {
            addSearch(query);
            onClose();
            router.push(`/explorer?q=${encodeURIComponent(query)}`);
            return;
        }

        // For people context, if just searching (Enter key), update URL
        if (context === "people" && query.trim() && (!item.type || item.type === "search")) {
            addSearch(query);
            onClose();
            router.push(`/people?q=${encodeURIComponent(query)}`);
            return;
        }

        // For project context, Enter should apply a Tasks search (interactive with page).
        if (context === "project" && query.trim() && (!item.type || item.type === "search")) {
            addSearch(query);
            onClose();
            const targetPath = pathname || "/";
            const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
            params.set("tab", "tasks");
            params.set("search", query.trim());
            params.set("page", "1");
            // Avoid keeping an unrelated task panel open when starting a new search.
            params.delete("task");
            params.delete("taskId");
            const qs = params.toString();
            router.push(`${targetPath}?${qs}`);
            return;
        }

        // Project context: selecting a task should deep-link into the Tasks tab and open the panel.
        if (context === "project" && item?.type === "task") {
            onClose();
            const targetPath = pathname || "/";
            const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
            params.set("tab", "tasks");
            params.set("task", item.id);
            const qs = params.toString();
            router.push(qs ? `${targetPath}?${qs}` : targetPath);
            return;
        }

        onClose();

        if (item.type === "user") {
            router.push(profileHref((item as any).username || item.id));
        } else if (item.type === "project") {
            router.push(projectHref((item as any).slug || item.id));
        } else if (item.type === "post") {
            router.push(`/post/${item.id}`);
        } else if (item.type === "message") {
            // Navigate to message in conversation
            if (item.url) {
                router.push(item.url);
            } else if (item.conversationId) {
                router.push(`/messages?conversation=${item.conversationId}${item.id ? `&message=${item.id}` : ''}`);
            }
            onClose();
        } else if (item.type === "action") {
            if (item.action === "create_task") {
                // For now navigate, but ideally open modal
                if (item.projectId) router.push(`/projects/${item.projectId}?action=new_task`);
            } else if (item.action === "create_project") {
                router.push('/hub?action=create');
            }
        } else if (typeof item === 'string') {
            // It's a tag or simple search
            router.push(`/explorer?q=${encodeURIComponent(item)}`);
        }
    };

    const renderResultRow = (result: any, index: number, keyPrefix = "") => {
        return (
            <button
                key={`${keyPrefix}${result.id || index}`}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors group"
            >
                {/* Icon / Avatar */}
                {result.type === "user" ? (
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        {result.avatar_url ? (
                            <Image src={result.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                                {result.username?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                ) : result.type === "project" ? (
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-lg">
                        {result.emoji || "📁"}
                    </div>
                ) : result.type === "task" ? (
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                ) : result.type === "message" ? (
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Search className="w-4 h-4 text-zinc-400" />
                    </div>
                )}

                {/* Text Info */}
                <div className="flex-1 text-left overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {result.type === "user" ? (
                                <Highlight text={result.full_name || result.username} query={query} />
                            ) : result.type === "project" ? (
                                <Highlight text={result.name} query={query} />
                            ) : result.type === "task" ? (
                                <Highlight text={result.title} query={query} />
                            ) : result.type === "message" ? (
                                <Highlight text={result.title || result.content} query={query} />
                            ) : (
                                <Highlight text={result.content} query={query} />
                            )}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            {result.type}
                        </span>
                    </div>
                    {result.type === "task" && (
                        <p className="text-xs text-zinc-500 truncate">
                            {String(result.priority || "").replace("_", " ")} • {String(result.status || "").replace("_", " ")}
                        </p>
                    )}
                    {result.type === "project" && result.description && (
                        <p className="text-xs text-zinc-500 truncate">
                            <Highlight text={result.description} query={query} />
                        </p>
                    )}
                    {result.type === "user" && (
                        <p className="text-xs text-zinc-500">
                            @<Highlight text={result.username} query={query} />
                        </p>
                    )}
                    {result.type === "message" && (
                        <p className="text-xs text-zinc-500 truncate">
                            {result.subtitle || `${result.conversationType} • ${result.sender}`}
                        </p>
                    )}
                </div>
            </button>
        );
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] px-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            />

            {/* Palette */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[70vh]"
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
                    <Search className="w-5 h-5 text-zinc-400" />
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={
                            context === "explorer" ? "Search topics, people..." :
                                context === "people" ? "Find connections..." :
                                    context === "hub" ? "Search projects..." :
                                        context === "project" ? "Search tasks, docs..." : "Type a command or search..."
                        }
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && query.trim()) {
                                e.preventDefault();
                                handleSelect({ type: "search" });
                            }
                        }}
                        className="flex-1 py-4 bg-transparent outline-none text-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-400">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">ESC</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-1 px-2 py-2 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto">
                    {[
                        { id: "all", label: "All", icon: Search },
                        { id: "projects", label: "Projects", icon: LayoutGrid },
                        { id: "people", label: "People", icon: Users },
                        { id: "posts", label: "Posts", icon: MessageSquare },
                        ...(context === "messages" ? [{ id: "messages", label: "Messages", icon: MessageSquare }] : []),
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">

                    {/* 1. Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-12 text-zinc-400">
                            <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-600 rounded-full animate-spin" />
                        </div>
                    )}

                    {/* 2. Empty Query State (Context Aware Previews) */}
                    {!loading && !query && (
                        <div className="space-y-6 p-2">

                            {/* Explorer Context: Trending Topics */}
                            {context === "explorer" && (
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Trending Now</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {trendingTags.map(tag => (
                                            <button key={tag} onClick={() => setQuery(tag)} className="text-left px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{tag}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* People Context: Suggested People */}
                            {context === "people" && (
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Suggested for you</h3>
                                    <div className="space-y-1">
                                        {suggestedPeople.map(person => (
                                            <button key={person.id} onClick={() => handleSelect({ ...person, type: "user" })} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors group">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent group-hover:ring-purple-200 dark:group-hover:ring-purple-900 transition-all">
                                                    {person.initials || person.username?.[0]?.toUpperCase()}
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{person.full_name || person.username}</div>
                                                    <div className="text-xs text-zinc-500">@{person.username}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Hub/Project Context: Recent/Your Projects & Actions */}
                            {(context === "hub" || context === "project") && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Actions Column */}
                                    <div>
                                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Quick Actions</h3>
                                        <div className="space-y-1">
                                            <button onClick={() => handleSelect({ type: 'action', action: 'create_project' })} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-left">
                                                <div className="p-1.5 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                    <Compass className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm text-zinc-700 dark:text-zinc-300">Create New Project</span>
                                            </button>
                                            {context === "project" && (
                                                <button onClick={() => handleSelect({ type: 'action', action: 'create_task', projectId: recentProjects[0]?.id })} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-left">
                                                    <div className="p-1.5 rounded-md bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                                        <CheckSquare className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Create New Task</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Projects Column */}
                                    {recentProjects.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Recent Projects</h3>
                                            <div className="space-y-1">
                                                {recentProjects.map(p => (
                                                    <button key={p.id} onClick={() => router.push(`/projects/${(p as any).slug || p.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-left">
                                                        <span className="text-lg">{p.emoji || "📁"}</span>
                                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{p.name || (p as any).title}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Recent Searches */}
                            {recentSearches.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Recent Searches</h3>
                                    <div className="space-y-1">
                                        {recentSearches.map((item) => {
                                            const term = typeof item === 'string' ? item : item.query;
                                            return (
                                                <button
                                                    key={typeof item === 'string' ? item : `${item.query}-${item.timestamp}`}
                                                    onClick={() => {
                                                        setQuery(term);
                                                        // If on hub context, also update URL
                                                        if (context === "hub") {
                                                            router.push(`/hub?q=${encodeURIComponent(term)}`);
                                                            onClose();
                                                        }
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-left"
                                                >
                                                    <History className="w-4 h-4 text-zinc-400" />
                                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{term}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. Autocomplete Suggestions (Hub context only) */}
                    {!loading && query && context === "hub" && suggestions.length > 0 && results.length === 0 && (
                        <div className="space-y-1">
                            <div className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Suggestions
                            </div>
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={`suggestion-${index}`}
                                    onClick={() => handleSelect(suggestion)}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-left"
                                >
                                    <Search className="w-4 h-4 text-zinc-400" />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{suggestion}</span>
                                </button>
                            ))}
                            {/* Option to search with current query */}
                            <button
                                onClick={() => handleSelect({ type: "search" })}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-1"
                            >
                                <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                    Search for "{query}"
                                </span>
                            </button>
                        </div>
                    )}

                    {/* 4. Search Results */}
                    {!loading && query && (projectTaskResults.length > 0 || results.length > 0) && (
                        <div className="space-y-3">
                            {context === "project" && projectTaskResults.length > 0 && (
                                <div>
                                    <div className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        This project
                                    </div>
                                    <div className="space-y-1">
                                        {projectTaskResults.map((r, i) => renderResultRow(r, i, "project-task-"))}
                                    </div>
                                </div>
                            )}

                            {results.length > 0 && (
                                <div className="space-y-1">
                                    {context === "project" && projectTaskResults.length > 0 && (
                                        <div className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            Across NB
                                        </div>
                                    )}
                                    {results.map((r, i) => renderResultRow(r, i, "global-"))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 5. No Results */}
                    {!loading && query && results.length === 0 && projectTaskResults.length === 0 && suggestions.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                                <Search className="w-6 h-6 text-zinc-400" />
                            </div>
                            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No results found</h3>
                            <p className="text-xs text-zinc-500 mt-1">Try searching for something else</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">↵</kbd>
                            select
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">↑↓</kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">esc</kbd>
                            close
                        </span>
                    </div>
                    {context !== 'default' && (
                        <span className="text-zinc-400">Searching in <span className="font-semibold text-zinc-600 dark:text-zinc-300 capitalize">{context}</span></span>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
