"use client";

// Force rebuild: Clear stale HMR cache - 2026-01-05-1419

import { useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
    Image as ImageIcon,
    X,
    BarChart2,
    Send,
    Users,
    Sparkles,
    Rocket
} from "lucide-react";
import Image from "next/image";
import { ContentWarningComposer } from "@/components/ContentWarning";
import DraftManager from "@/components/explorer/DraftManager";
import dynamic from "next/dynamic";
import { toast } from 'sonner';
import { useBackgroundUpload } from "@/context/UserUploadContext";

// Hooks & Sub-components
import { useComposer, MediaItem } from "@/hooks/useComposer";
import { MediaManager } from "./composer/MediaManager";
import { TiptapEditor } from "./composer/TiptapEditor";
import { LaunchpadWizard } from "./composer/LaunchpadWizard";

const PollCreator = dynamic(() => import("./PollCreator"), {
    loading: () => <div className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
});



interface PremiumComposerProps {
    currentUser: any;
    onPostCreated: (post?: any) => void;
}

export default function PremiumPostComposer({ currentUser, onPostCreated }: PremiumComposerProps) {
    const supabase = createSupabaseBrowserClient();
    const { state, dispatch } = useComposer();
    const { startPost } = useBackgroundUpload();
    const containerRef = useRef<HTMLDivElement>(null);

    // Destructure commonly used state
    const {
        isExpanded, activeTab, content, mediaItems, uploadProgress,
        uploading, contentWarning,
        pollQuestion, pollOptions, collabRoles, collabSkills, tagsInput
    } = state;

    // ...


    const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newItems: MediaItem[] = [];


        files.forEach(file => {
            const isVideo = file.type.startsWith('video/');
            newItems.push({
                file,
                preview: URL.createObjectURL(file),
                type: isVideo ? 'video' : 'image'
            });
        });

        // Add to state
        dispatch({ type: 'ADD_MEDIA', payload: newItems });
        dispatch({ type: 'SET_EXPANDED', payload: true });

        e.target.value = '';
    };

    const handlePost = async () => {
        if (!currentUser) return;

        // Validation Logic
        if (!content.trim() && mediaItems.length === 0 && activeTab !== 'poll' && activeTab !== 'project_idea') return;

        dispatch({ type: 'SET_UPLOADING', payload: true });

        try {
            // Extract hashtags
            const extractedHashtags = (content.match(/#(\w+)/g) || []).map(t => t.slice(1).toLowerCase());
            const tagsFromInput = tagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
            const allTags = [...new Set([...tagsFromInput, ...extractedHashtags])].slice(0, 10);

            const insertBody: any = {
                content: content.trim(),
                user_id: currentUser.id,
                post_type: activeTab,
                tags: allTags.length ? allTags : null,
                status: 'published'
            };

            if (activeTab === 'collaboration') {
                insertBody.collaboration_data = {
                    looking_for: collabRoles.split(',').filter(Boolean),
                    skills_needed: collabSkills.split(',').filter(Boolean),
                };
            }

            if (activeTab === 'poll') {
                insertBody.poll_data = {
                    question: pollQuestion,
                    options: pollOptions.filter(Boolean)
                };
            }

            if (activeTab === 'project_idea') {
                const { data: idea, error: ideaErr } = await supabase.from("project_ideas").insert({
                    title: state.ideaTitle,
                    short_description: state.ideaDescription,
                    description: state.ideaLongDescription,
                    problem_statement: state.ideaProblem,
                    proposed_solution: state.ideaSolution,
                    roles_needed: state.ideaOpenRoles,
                    tags: state.ideaTags,
                    project_template: state.ideaTemplateId,
                    creator_id: currentUser.id,
                    status: 'ideation',
                    type: 'idea'
                }).select().single();

                if (ideaErr) throw ideaErr;
                insertBody.project_idea_id = idea.id;
                // Fallback content if empty
                if (!content.trim()) insertBody.content = `${state.ideaTitle}\n\n${state.ideaDescription}`;
            }

            if (contentWarning.trim()) insertBody.content_warning = contentWarning.trim();

            // Start Optimistic Background Upload
            startPost(insertBody, mediaItems);

            // Cleanup
            dispatch({ type: 'RESET' });
            toast.success("Posting in background...");

            // Optimistic Update
            // We create a fake ID for optimistic rendering
            const enriched = {
                id: `temp-${Date.now()}`,
                created_at: new Date().toISOString(),
                ...insertBody,
                profiles: currentUser,
                likes_count: 0, comments_count: 0, reposts_count: 0, saved_count: 0, views_count: 0,
                user_has_liked: false, user_has_saved: false, is_reply: false,
                media: mediaItems.length > 0 ? (mediaItems.length === 1 && mediaItems[0] && mediaItems[0].type === 'video' ? { type: 'video', url: mediaItems[0].preview } : { type: 'image', urls: mediaItems.map(m => m.preview) }) : null
            };
            onPostCreated(enriched);

        } catch (err: any) {
            console.error("Post Error", err); // Only validation errors here
            alert(`Error: ${err.message}`);
        } finally {
            dispatch({ type: 'SET_UPLOADING', payload: false });
        }
    };

    const renderAvatar = () => (
        <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-blue-500/20">
            {currentUser?.avatar_url ? (
                <Image src={currentUser.avatar_url} alt="User" fill className="object-cover" />
            ) : (
                <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                    {(currentUser?.username?.[0] || 'U').toUpperCase()}
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full mb-6" ref={containerRef}>
            <AnimatePresence mode="wait">
                {!isExpanded ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 cursor-text group"
                        onClick={() => dispatch({ type: 'SET_EXPANDED', payload: true })}
                    >
                        <div className="flex items-center gap-4">
                            {renderAvatar()}
                            <div className="flex-1 text-zinc-400 font-medium text-lg">Share your project journey...</div>
                            <button className="p-2 hover:bg-zinc-100 rounded-full"><ImageIcon className="w-5 h-5" /></button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
                    >
                        {/* Header Tabs */}
                        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {[
                                    { id: 'standard', icon: Sparkles, label: 'Post' },
                                    { id: 'project_idea', icon: Rocket, label: 'Launchpad' },
                                    { id: 'poll', icon: BarChart2, label: 'Poll' },
                                    { id: 'collaboration', icon: Users, label: 'Collab' },
                                ].map((type: any) => (
                                    <button
                                        key={type.id}
                                        onClick={() => dispatch({ type: 'SET_TYPE', payload: type.id })}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === type.id ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-sm" : "text-zinc-500 hover:bg-zinc-200/50"
                                            }`}
                                    >
                                        <type.icon className="w-3 h-3" />
                                        <span>{type.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <DraftManager
                                    currentUser={currentUser}
                                    onRestoreDraft={(d) => dispatch({
                                        type: 'RESTORE_DRAFT',
                                        payload: typeof d === 'string' ? { content: d } : d
                                    })}
                                />
                                <button onClick={() => dispatch({ type: 'SET_EXPANDED', payload: false })} className="p-1.5 rounded-full hover:bg-zinc-100"><X className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0">{renderAvatar()}</div>
                                <div className="flex-1 min-w-0">
                                    <TiptapEditor
                                        content={content}
                                        placeholder={"What's happening?"}
                                        dispatch={dispatch}
                                    />

                                    {/* Feature Modules */}
                                    {activeTab === 'project_idea' && (
                                        <LaunchpadWizard state={state} dispatch={dispatch} onLaunch={handlePost} />
                                    )}

                                    <MediaManager
                                        mediaItems={mediaItems}
                                        uploadProgress={uploadProgress}
                                        onRemove={(i) => dispatch({ type: 'REMOVE_MEDIA', payload: i })}
                                    />

                                    <AnimatePresence>
                                        {activeTab === 'poll' && (
                                            <PollCreator
                                                question={pollQuestion}
                                                setQuestion={(q: string) => dispatch({ type: 'SET_POLL_QUESTION', payload: q })}
                                                options={pollOptions}
                                                setOptions={(o) => {
                                                    const newOptions = typeof o === 'function' ? o(pollOptions) : o;
                                                    dispatch({ type: 'SET_POLL_OPTIONS', payload: newOptions });
                                                }}
                                            />
                                        )}
                                        {activeTab === 'collaboration' && (
                                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="mb-4 grid grid-cols-2 gap-3">
                                                <input
                                                    value={collabRoles}
                                                    onChange={e => dispatch({ type: 'SET_COLLAB_ROLES', payload: e.target.value })}
                                                    placeholder="Roles needed (e.g. Designer)"
                                                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                                />
                                                <input
                                                    value={collabSkills}
                                                    onChange={e => dispatch({ type: 'SET_COLLAB_SKILLS', payload: e.target.value })}
                                                    placeholder="Skills (e.g. React)"
                                                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Footer Actions */}
                                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center justify-center p-2 text-zinc-500 hover:bg-blue-50 rounded-full cursor-pointer transition-colors">
                                                <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={handleMediaSelect} />
                                                <ImageIcon className="w-5 h-5" />
                                            </label>
                                            <ContentWarningComposer value={contentWarning} onChange={(v) => dispatch({ type: 'SET_WARNING', payload: v })} />
                                        </div>

                                        <button
                                            onClick={handlePost}
                                            disabled={uploading || (!content.trim() && mediaItems.length === 0 && activeTab !== 'poll' && activeTab !== 'project_idea')}
                                            className="flex items-center gap-2 px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-medium disabled:opacity-50 transition-all text-sm"
                                        >
                                            {uploading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Posting...</span>
                                                </>
                                            ) : (
                                                <><span>Post</span><Send className="w-4 h-4" /></>
                                            )}
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
