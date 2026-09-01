"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCookieConsent } from "@/components/providers/CookieProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { generateSlug, generateUniqueSlug, generateProjectId, generateUniqueProjectId } from "@/lib/utils/project-ids";
import {
    ArrowLeft,
    Heart,
    MessageCircle,
    Eye,
    UserPlus,
    Users,
    Zap,
    Lightbulb,
    Target,
    CheckCircle,
    X,
    Loader2,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { profileHref } from "@/lib/routing/identifiers";

const PreApplicationModal = dynamic(() => import("@/components/projects/PreApplicationModal"), { ssr: false });
const PreApplicationManagement = dynamic(() => import("@/components/projects/PreApplicationManagement"), { ssr: false });

interface IdeaDetailClientProps {
    ideaId: string;
    initialIdea: any;
    initialCreator: any;
    initialLinkedPostId: string | null;
    initialCommentPreview: any[];
    initialUser: any;
    initialLiked: boolean;
    initialHasPreApplication: boolean;
    initialPreApplicationStatus: string | null;
    initialPreTeamMembers: any[];
}

export default function IdeaDetailClient({
    ideaId: id,
    initialIdea,
    initialCreator,
    initialLinkedPostId,
    initialCommentPreview,
    initialUser,
    initialLiked,
    initialHasPreApplication,
    initialPreApplicationStatus,
    initialPreTeamMembers
}: IdeaDetailClientProps) {
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();
    const { preferences } = useCookieConsent();

    const [idea, setIdea] = useState<any>(initialIdea);
    const [creator, setCreator] = useState<any>(initialCreator);
    const [loading, setLoading] = useState(!initialIdea);
    const [currentUserId, setCurrentUserId] = useState<string | null>(initialUser?.id || null);
    const [liked, setLiked] = useState(initialLiked);
    const [likesCount, setLikesCount] = useState(initialIdea?.likes_count || 0);
    const [commentsCount, setCommentsCount] = useState(initialIdea?.comments_count || 0);
    const [viewCount, setViewCount] = useState(initialIdea?.view_count || 0);
    const [hasPreApplication, setHasPreApplication] = useState(initialHasPreApplication);
    const [preApplicationStatus, setPreApplicationStatus] = useState<string | null>(initialPreApplicationStatus);
    const [preTeamMembers, setPreTeamMembers] = useState<any[]>(initialPreTeamMembers);
    const [preTeamCount, setPreTeamCount] = useState((initialPreTeamMembers?.length || 0) + 1);
    const [showPreApplyModal, setShowPreApplyModal] = useState(false);
    const [showPreApplicationManagement, setShowPreApplicationManagement] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [linkedPostId, setLinkedPostId] = useState<string | null>(initialLinkedPostId);
    const [commentPreview, setCommentPreview] = useState<any[]>(initialCommentPreview);

    useEffect(() => {
        if (!initialUser) {
            async function loadCurrentUser() {
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUserId(user?.id || null);
            }
            loadCurrentUser();
        }
    }, [supabase, initialUser]);

    useEffect(() => {
        if (!id) return;
        if (!initialIdea) {
            loadIdea();
        }
        recordView();
    }, [id, currentUserId, initialIdea]);

    async function loadIdea() {
        if (!id) return;
        setLoading(true);

        try {
            // Load idea
            const { data: ideaData, error: ideaError } = await supabase
                .from("project_ideas")
                .select("*")
                .eq("id", id)
                .single();

            if (ideaError) throw ideaError;
            if (!ideaData) {
                setLoading(false);
                return;
            }

            setIdea(ideaData);
            setLikesCount(ideaData.likes_count || 0);
            setCommentsCount(ideaData.comments_count || 0);
            setViewCount(ideaData.view_count || 0);

            // Load creator
            const { data: creatorData } = await supabase
                .from("profiles")
                .select("id, username, full_name, avatar_url")
                .eq("id", ideaData.creator_id)
                .single();

            if (creatorData) setCreator(creatorData);

            // Load linked post
            const { data: postData } = await supabase
                .from("posts")
                .select("id")
                .eq("project_idea_id", id)
                .single();

            if (postData) {
                setLinkedPostId(postData.id);

                // Load a small preview of recent comments for the community card
                const { data: previewComments } = await supabase
                    .from("posts")
                    .select(`
            id,
            content,
            created_at,
            user_id,
            profiles:user_id (
              username,
              full_name,
              avatar_url
            )
          `)
                    .eq("parent_post_id", postData.id)
                    .eq("is_reply", true)
                    .order("created_at", { ascending: false })
                    .limit(3);

                setCommentPreview(previewComments || []);
            } else {
                setLinkedPostId(null);
                setCommentPreview([]);
            }

            // Load user's like status
            if (currentUserId) {
                const { data: likeData } = await supabase
                    .from("project_idea_likes")
                    .select("id")
                    .eq("idea_id", id)
                    .eq("user_id", currentUserId)
                    .single();

                setLiked(!!likeData);

                // Load user's pre-application status
                const { data: appData } = await supabase
                    .from("project_idea_pre_applications")
                    .select("status")
                    .eq("idea_id", id)
                    .eq("user_id", currentUserId)
                    .single();

                if (appData) {
                    setHasPreApplication(true);
                    setPreApplicationStatus(appData.status);
                }
            }

            // Load pre-team members (accepted applications)
            const { data: preTeamData } = await supabase
                .from("project_idea_pre_applications")
                .select("user_id, role_name, profiles:user_id(id, username, full_name, avatar_url)")
                .eq("idea_id", id)
                .eq("status", "accepted");
            const members = preTeamData || [];
            setPreTeamMembers(members);
            // Team count includes creator as a member
            setPreTeamCount((members.length || 0) + 1);
        } catch (error) {
            console.error("Error loading idea:", error);
        } finally {
            setLoading(false);
        }
    }

    async function recordView() {
        if (!id || !currentUserId || !preferences.analytics) return;
        try {
            await supabase.rpc("increment_project_idea_view_count", {
                idea_id_param: id,
            });
        } catch (error) {
            console.error("Error recording view:", error);
        }
    }

    async function toggleLike() {
        if (!currentUserId || !id) {
            router.push("/login");
            return;
        }

        try {
            if (liked) {
                await supabase
                    .from("project_idea_likes")
                    .delete()
                    .eq("idea_id", id)
                    .eq("user_id", currentUserId);
                setLiked(false);
                setLikesCount((prev: number) => Math.max(0, prev - 1));
            } else {
                await supabase.from("project_idea_likes").insert({
                    idea_id: id,
                    user_id: currentUserId,
                });
                setLiked(true);
                setLikesCount((prev: number) => prev + 1);
            }
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    }

    const isCreator = currentUserId === idea?.creator_id;
    const rolesNeeded = (idea?.roles_needed || []) as Array<{ role_name: string; description: string }>;

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-600 dark:text-zinc-400">Loading idea...</p>
                </div>
            </div>
        );
    }

    if (!idea) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-zinc-600 dark:text-zinc-400">Idea not found.</p>
                    <Link href="/explorer" className="text-indigo-600 hover:underline mt-2 inline-block">
                        Back to Explorer
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-4 h-screen">
                {/* Top bar */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <div className="hidden sm:flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900">
                                    <Lightbulb className="w-3 h-3" />
                                    Project Idea
                                </span>
                                {idea.status === "seeking_feedback" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                        Seeking Feedback
                                    </span>
                                )}
                                {idea.status === "seeking_collaborators" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                                        Seeking Collaborators
                                    </span>
                                )}
                                {idea.converted_to_project_id && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                                        <CheckCircle className="w-3 h-3" />
                                        Converted
                                    </span>
                                )}
                            </div>
                            <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-zinc-100 line-clamp-1">
                                {idea.title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                            <div className="flex items-center gap-1.5">
                                <Eye className="w-4 h-4" />
                                <span className="font-medium">{viewCount}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span className="font-medium">{preTeamCount}</span>
                                <span className="text-zinc-500">pre-team</span>
                            </div>
                        </div>
                        <button
                            onClick={toggleLike}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border transition-colors ${liked
                                ? "border-red-500 text-red-500 bg-red-50 dark:bg-red-950/20"
                                : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-red-500 hover:text-red-500"
                                }`}
                        >
                            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                            <span>{likesCount}</span>
                        </button>
                    </div>
                </div>

                {/* Dashboard grid: fits in one frame */}
                <div className="grid grid-cols-12 grid-rows-2 gap-4 flex-1 min-h-0 h-[calc(100vh-96px)]">
                    {/* Overview card - main narrative (scrollable internally) */}
                    <div className="col-span-12 lg:col-span-7 row-span-2">
                        <IdeaOverviewCard
                            idea={idea}
                            creator={creator}
                            viewCount={viewCount}
                            likesCount={likesCount}
                            liked={liked}
                            commentsCount={commentsCount}
                            preTeamCount={preTeamCount}
                            onToggleLike={toggleLike}
                            linkedPostId={linkedPostId}
                        />
                    </div>

                    {/* Team / Pre-team card */}
                    <div className="col-span-12 lg:col-span-5 row-span-1">
                        <IdeaTeamCard
                            idea={idea}
                            rolesNeeded={rolesNeeded}
                            preTeamCount={preTeamCount}
                            preTeamMembers={preTeamMembers}
                            creator={creator}
                            isCreator={isCreator}
                            currentUserId={currentUserId}
                            hasPreApplication={hasPreApplication}
                            preApplicationStatus={preApplicationStatus}
                            onOpenPreApply={() => setShowPreApplyModal(true)}
                            onOpenManage={() => setShowPreApplicationManagement(true)}
                            onOpenConvert={() => setShowConvertModal(true)}
                        />
                    </div>

                    {/* Community & meta card */}
                    <div className="col-span-12 lg:col-span-5 row-span-1">
                        <IdeaCommunityCard
                            idea={idea}
                            commentsCount={commentsCount}
                            linkedPostId={linkedPostId}
                            viewCount={viewCount}
                            likesCount={likesCount}
                            commentPreview={commentPreview}
                        />
                    </div>
                </div>
            </div>
            {/* Modals */}
            {showPreApplyModal && (
                <PreApplicationModal
                    ideaId={id}
                    idea={idea}
                    onClose={() => {
                        setShowPreApplyModal(false);
                        loadIdea();
                    }}
                    onSuccess={() => {
                        setShowPreApplyModal(false);
                        loadIdea();
                    }}
                />
            )}

            {showPreApplicationManagement && (
                <PreApplicationManagement
                    ideaId={id}
                    onClose={() => {
                        setShowPreApplicationManagement(false);
                        loadIdea();
                    }}
                    onUpdate={() => {
                        loadIdea();
                    }}
                />
            )}

            {showConvertModal && idea && (
                <ConvertIdeaToProjectModal
                    idea={idea}
                    onClose={() => setShowConvertModal(false)}
                    onSuccess={async (projectId) => {
                        setShowConvertModal(false);
                        // Fetch slug for the newly created project
                        const { data: project } = await supabase
                            .from("projects")
                            .select("slug")
                            .eq("id", projectId)
                            .single();
                        router.push(`/projects/${project?.slug || projectId}`);
                    }}
                />
            )}
        </div>
    );
}

interface IdeaOverviewCardProps {
    idea: any;
    creator: any;
    viewCount: number;
    likesCount: number;
    liked: boolean;
    commentsCount: number;
    preTeamCount: number;
    onToggleLike: () => void;
    linkedPostId: string | null;
}

function IdeaOverviewCard({
    idea,
    creator,
    viewCount,
    likesCount,
    liked,
    commentsCount,
    preTeamCount,
    onToggleLike,
    linkedPostId,
}: IdeaOverviewCardProps) {
    return (
        <div className="h-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900">
                            <Lightbulb className="w-3 h-3" />
                            Project Idea
                        </span>
                        {idea.status === "seeking_feedback" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                Seeking Feedback
                            </span>
                        )}
                        {idea.status === "seeking_collaborators" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                                Seeking Collaborators
                            </span>
                        )}
                        {idea.converted_to_project_id && (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                                <CheckCircle className="w-3 h-3" />
                                Converted
                            </span>
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 line-clamp-2">
                        {idea.title}
                    </h2>
                    {idea.short_description && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400 line-clamp-2">
                            {idea.short_description}
                        </p>
                    )}

                    {/* Creator */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>Created by</span>
                        <Link
                            href={profileHref({ id: idea.creator_id, username: creator?.username })}
                            className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[11px] font-semibold">
                                {creator?.full_name?.[0]?.toUpperCase() ||
                                    creator?.username?.[0]?.toUpperCase() ||
                                    "C"}
                            </div>
                            <span className="truncate max-w-[140px]">
                                {creator?.full_name || creator?.username || "Creator"}
                            </span>
                        </Link>
                    </div>
                </div>

                {/* Quick stats */}
                <div className="flex flex-col items-end gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>{viewCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{preTeamCount}</span>
                        <span className="text-zinc-500">pre-team</span>
                    </div>
                    {linkedPostId && (
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            <span>{commentsCount}</span>
                        </div>
                    )}
                    <button
                        onClick={onToggleLike}
                        className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-colors ${liked
                            ? "border-red-500 text-red-500 bg-red-50 dark:bg-red-950/20"
                            : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-red-500 hover:text-red-500"
                            }`}
                    >
                        <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
                        <span>{likesCount}</span>
                    </button>
                </div>
            </div>

            {/* Body - full details, scrollable within the card */}
            <div className="mt-4 flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
                {idea.problem_statement && (
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                            <Target className="w-3.5 h-3.5" />
                            Problem
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                            {idea.problem_statement}
                        </p>
                    </div>
                )}

                {idea.proposed_solution && (
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" />
                            Solution
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                            {idea.proposed_solution}
                        </p>
                    </div>
                )}

                {idea.long_term_vision && (
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                            Long-term Vision
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                            {idea.long_term_vision}
                        </p>
                    </div>
                )}

                {(idea.target_audience || idea.unique_value_proposition) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {idea.target_audience && (
                            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                                    <Target className="w-3.5 h-3.5" />
                                    Target Audience
                                </div>
                                <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">
                                    {idea.target_audience}
                                </p>
                            </div>
                        )}
                        {idea.unique_value_proposition && (
                            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                                    <Zap className="w-3.5 h-3.5" />
                                    Unique Value Proposition
                                </div>
                                <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">
                                    {idea.unique_value_proposition}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Media & video preview */}
                {idea.media && Array.isArray(idea.media) && idea.media.length > 0 && (
                    <div>
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 mb-2">
                            Visuals
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {idea.media.slice(0, 4).map((mediaItem: any) => (
                                <div
                                    key={mediaItem.id}
                                    className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"
                                >
                                    <Image
                                        src={mediaItem.url}
                                        alt={mediaItem.caption || "Idea visual"}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {idea.video_pitch_url && (
                    <div>
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 mb-2">
                            Video Pitch
                        </h3>
                        <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                            <iframe
                                src={idea.video_pitch_url}
                                className="w-full h-40"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer tags row */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                {idea.tags && idea.tags.length > 0 && (
                    <>
                        {idea.tags.slice(0, 3).map((tag: string) => (
                            <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                            >
                                #{tag}
                            </span>
                        ))}
                        {idea.tags.length > 3 && (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                +{idea.tags.length - 3} more
                            </span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

interface IdeaTeamCardProps {
    idea: any;
    rolesNeeded: Array<{ role_name: string; description: string }>;
    preTeamCount: number;
    preTeamMembers: any[];
    creator: any;
    isCreator: boolean;
    currentUserId: string | null;
    hasPreApplication: boolean;
    preApplicationStatus: string | null;
    onOpenPreApply: () => void;
    onOpenManage: () => void;
    onOpenConvert: () => void;
}

function IdeaTeamCard({
    idea,
    rolesNeeded,
    preTeamCount,
    preTeamMembers,
    creator,
    isCreator,
    currentUserId,
    hasPreApplication,
    preApplicationStatus,
    onOpenPreApply,
    onOpenManage,
    onOpenConvert,
}: IdeaTeamCardProps) {
    const canPreApply = !!currentUserId && !isCreator;

    const teamMembers = (() => {
        const members = [...(preTeamMembers || [])];
        // Ensure creator appears as first team member
        const creatorMember =
            creator && idea?.creator_id
                ? {
                    user_id: idea.creator_id,
                    role_name: "Creator",
                    profiles: {
                        id: idea.creator_id,
                        username: creator.username,
                        full_name: creator.full_name,
                        avatar_url: creator.avatar_url,
                    },
                }
                : null;

        const byId = new Map<string, any>();
        if (creatorMember) {
            byId.set(creatorMember.user_id, creatorMember);
        }
        for (const m of members) {
            if (!m?.user_id) continue;
            if (!byId.has(m.user_id)) {
                byId.set(m.user_id, m);
            }
        }
        return Array.from(byId.values());
    })();

    return (
        <div className="h-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Team & Roles
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                        {teamMembers.length} team member{teamMembers.length === 1 ? "" : "s"}
                    </p>
                </div>
                {idea.status === "seeking_collaborators" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        Open to collaborators
                    </span>
                )}
            </div>

            {/* Team avatars */}
            <div className="mt-2 flex flex-wrap gap-2">
                {teamMembers.slice(0, 4).map((member) => (
                    <div
                        key={member.user_id}
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 bg-zinc-50 dark:bg-zinc-900/60"
                    >
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-semibold">
                            {member.profiles?.avatar_url ? (
                                <Image
                                    src={member.profiles.avatar_url}
                                    alt={member.profiles.full_name || member.profiles.username || "User"}
                                    width={24}
                                    height={24}
                                    className="rounded-full object-cover"
                                />
                            ) : (
                                (member.profiles?.full_name ||
                                    member.profiles?.username ||
                                    "U")
                                    .slice(0, 1)
                                    .toUpperCase()
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-900 dark:text-zinc-100 max-w-[120px] truncate">
                                {member.profiles?.full_name || member.profiles?.username || "User"}
                            </span>
                            {member.role_name && (
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                    {member.role_name}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                {teamMembers.length > 4 && (
                    <span className="text-xs text-zinc-500">
                        +{teamMembers.length - 4} more
                    </span>
                )}
            </div>

            {/* Roles preview */}
            <div className="mt-3 flex-1 min-h-0 space-y-2 overflow-hidden">
                {rolesNeeded.length === 0 ? (
                    <p className="text-sm text-zinc-500">No specific roles listed yet.</p>
                ) : (
                    <div className="space-y-1.5">
                        {rolesNeeded.slice(0, 3).map((role, idx) => (
                            <div
                                key={`${role.role_name}-${idx}`}
                                className="flex items-start gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2"
                            >
                                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-slate-900 dark:text-zinc-100 truncate">
                                            {role.role_name}
                                        </span>
                                    </div>
                                    {role.description && (
                                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                            {role.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {rolesNeeded.length > 3 && (
                            <p className="text-xs text-zinc-500">
                                +{rolesNeeded.length - 3} more role
                                {rolesNeeded.length - 3 === 1 ? "" : "s"}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                {!isCreator && canPreApply && (
                    <>
                        {!hasPreApplication ? (
                            <button
                                onClick={onOpenPreApply}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-sm font-medium px-3.5 py-1.5 transition-colors"
                            >
                                <UserPlus className="w-4 h-4" />
                                Pre-Apply
                            </button>
                        ) : (
                            <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium px-3 py-1.5">
                                {preApplicationStatus === "pending" && (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Application Pending
                                    </>
                                )}
                                {preApplicationStatus === "accepted" && (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        Accepted to Pre-Team
                                    </>
                                )}
                                {preApplicationStatus === "rejected" && (
                                    <>
                                        <X className="w-4 h-4 text-red-600" />
                                        Application Rejected
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}

                {isCreator && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={onOpenManage}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <Users className="w-4 h-4" />
                            Manage Pre-Applications ({preTeamCount})
                        </button>
                        {!idea.converted_to_project_id ? (
                            <button
                                onClick={onOpenConvert}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 transition-colors"
                            >
                                <Zap className="w-4 h-4" />
                                Convert to Project
                            </button>
                        ) : (
                            <Link
                                href={`/projects/${idea.converted_to_project_id}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-medium px-3 py-1.5 transition-colors"
                            >
                                View Project
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

interface IdeaCommunityCardProps {
    idea: any;
    commentsCount: number;
    linkedPostId: string | null;
    viewCount: number;
    likesCount: number;
    commentPreview: any[];
}

function IdeaCommunityCard({
    idea,
    commentsCount,
    linkedPostId,
    viewCount,
    likesCount,
    commentPreview,
}: IdeaCommunityCardProps) {
    function formatCommentAuthor(c: any) {
        return c?.profiles?.full_name || c?.profiles?.username || "User";
    }

    function formatCommentSnippet(c: any) {
        const text = c?.content || "";
        if (text.length <= 80) return text;
        return text.slice(0, 80) + "…";
    }

    function formatCommentTime(c: any) {
        if (!c?.created_at) return "";
        const date = new Date(c.created_at);
        return date.toLocaleDateString("en-US");
    }

    return (
        <div className="h-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Community & Feedback
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                        {commentsCount} comment{commentsCount === 1 ? "" : "s"} on this idea
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col justify-between">
                <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3">
                        <p className="font-medium text-slate-900 dark:text-zinc-100 mb-1">
                            Snapshot
                        </p>
                        <p className="text-xs">
                            {likesCount.toLocaleString("en-US")} people liked this idea and it has been
                            viewed {viewCount.toLocaleString("en-US")} times.
                        </p>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3">
                        <p className="font-medium text-slate-900 dark:text-zinc-100 mb-1">
                            What kind of feedback helps?
                        </p>
                        <ul className="list-disc list-inside space-y-0.5">
                            <li>Is the problem clear and compelling?</li>
                            <li>Does the solution feel realistic?</li>
                            <li>What risks or unknowns do you see?</li>
                        </ul>
                    </div>
                    {commentsCount > 0 && (
                        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3">
                            <p className="font-medium text-slate-900 dark:text-zinc-100 mb-1">
                                Recent comments
                            </p>
                            <div className="space-y-1.5">
                                {commentPreview && commentPreview.length > 0 ? (
                                    commentPreview.map((c) => (
                                        <div
                                            key={c.id}
                                            className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300"
                                        >
                                            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-medium truncate max-w-[140px]">
                                                        {formatCommentAuthor(c)}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500">
                                                        {formatCommentTime(c)}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2">
                                                    {formatCommentSnippet(c)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[11px] text-zinc-500">
                                        Comments exist on the linked post. Open the thread to read them.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                    {linkedPostId ? (
                        <Link
                            href={`/post/${linkedPostId}`}
                            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <MessageCircle className="w-4 h-4" />
                            View comments thread
                        </Link>
                    ) : (
                        <p className="text-xs text-zinc-500">
                            Comments become available once this idea is shared to the explorer.
                        </p>
                    )}

                    <div className="hidden sm:flex flex-col items-end text-[11px] text-zinc-500">
                        {idea.tech_stack && idea.tech_stack.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-end">
                                {idea.tech_stack.slice(0, 2).map((tech: string) => (
                                    <span
                                        key={tech}
                                        className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900"
                                    >
                                        {tech}
                                    </span>
                                ))}
                                {idea.tech_stack.length > 2 && (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                                        +{idea.tech_stack.length - 2} more
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


// Convert Idea to Project Modal Component
function ConvertIdeaToProjectModal({ idea, onClose, onSuccess }: { idea: any; onClose: () => void; onSuccess: (projectId: string) => void }) {
    const supabase = createSupabaseBrowserClient();

    const [loading, setLoading] = useState(false);
    const [preTeamMembers, setPreTeamMembers] = useState<any[]>([]);

    useEffect(() => {
        loadPreTeamMembers();
    }, [idea.id]);

    async function loadPreTeamMembers() {
        const { data } = await supabase
            .from("project_idea_pre_applications")
            .select("user_id, role_name, profiles:user_id(id, username, full_name)")
            .eq("idea_id", idea.id)
            .eq("status", "accepted");

        if (data) setPreTeamMembers(data);
    }

    async function handleConvert() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Create project with idea data
            const rolesNeeded = (idea.roles_needed || []) as Array<{ role_name: string; description: string }>;
            const openRoles = rolesNeeded.map((role) => ({
                role: role.role_name,
                count: 1,
                description: role.description || "",
                skills: idea.skills_needed || [],
            }));

            // Determine lifecycle stages based on idea type/domain
            let lifecycleStages: string[] = [];
            if (idea.domain === "edtech" || idea.domain === "fintech") {
                lifecycleStages = ["Planning", "Development", "Testing", "Launch"];
            } else {
                lifecycleStages = ["Ideation", "Development", "Testing", "Release"];
            }

            // Build description from idea fields
            const descriptionParts = [];
            if (idea.problem_statement) descriptionParts.push(`Problem: ${idea.problem_statement}`);
            if (idea.proposed_solution) descriptionParts.push(`Solution: ${idea.proposed_solution}`);
            if (idea.long_term_vision) descriptionParts.push(`Vision: ${idea.long_term_vision}`);
            if (idea.target_audience) descriptionParts.push(`Target Audience: ${idea.target_audience}`);
            if (idea.unique_value_proposition) descriptionParts.push(`Value Proposition: ${idea.unique_value_proposition}`);

            const fullDescription = descriptionParts.join("\n\n");



            // Generate slug and project_id
            const trimmedTitle = idea.title.trim();
            const baseSlug = generateSlug(trimmedTitle);
            const baseProjectId = generateProjectId(trimmedTitle);

            // Check for existing slugs and project_ids to ensure uniqueness
            const [slugsResult, projectIdsResult] = await Promise.all([
                supabase.from("projects").select("slug").not("slug", "is", null),
                supabase.from("projects").select("project_id").not("project_id", "is", null)
            ]);

            const existingSlugs = (slugsResult.data || []).map(p => p.slug).filter(Boolean) as string[];
            const existingProjectIds = (projectIdsResult.data || []).map(p => p.project_id).filter(Boolean) as string[];

            const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
            const uniqueProjectId = generateUniqueProjectId(baseProjectId, existingProjectIds);

            const { data: projectData, error: projectError } = await supabase
                .from("projects")
                .insert({
                    title: trimmedTitle,
                    short_description: idea.short_description,
                    description: fullDescription || idea.short_description,
                    problem_statement: idea.problem_statement,
                    solution_overview: idea.proposed_solution,
                    project_type: idea.domain || "other",
                    custom_project_type: idea.domain === "other" ? idea.domain : null,
                    tags: idea.tags,
                    lifecycle_stages: lifecycleStages,
                    open_roles: openRoles,
                    technologies_used: idea.tech_stack || [],

                    creator_id: user.id,
                    status: "open",
                    visibility: "public",
                    slug: uniqueSlug,
                    project_id: uniqueProjectId,
                })
                .select()
                .single();

            if (projectError) throw projectError;

            // Add pre-team members as collaborators
            if (preTeamMembers.length > 0) {
                const collaborators = preTeamMembers.map((member) => ({
                    project_id: projectData.id,
                    user_id: member.user_id,
                    role: member.role_name || "Collaborator",
                    status: "active",
                }));

                await supabase.from("project_collaborators").insert(collaborators);
            }

            // Update idea to mark as converted
            await supabase
                .from("project_ideas")
                .update({ converted_to_project_id: projectData.id })
                .eq("id", idea.id);

            onSuccess(projectData.id);
        } catch (error) {
            console.error("Error converting idea to project:", error);
            alert("Failed to convert idea to project. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full shadow-xl">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        Convert Idea to Project
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        This will create a new project with your idea data and add pre-team members as collaborators.
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    {preTeamMembers.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                Pre-Team Members ({preTeamMembers.length})
                            </h3>
                            <div className="space-y-2">
                                {preTeamMembers.map((member) => (
                                    <div
                                        key={member.user_id}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                                            {member.profiles?.full_name?.[0]?.toUpperCase() || member.profiles?.username?.[0]?.toUpperCase() || "U"}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                                {member.profiles?.full_name || member.profiles?.username || "User"}
                                            </div>
                                            {member.role_name && (
                                                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                                    {member.role_name}
                                                </div>
                                            )}
                                        </div>
                                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                                These members will automatically become collaborators in the new project.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConvert}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Convert to Project
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
