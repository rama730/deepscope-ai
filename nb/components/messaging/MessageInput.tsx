"use client";

import { useState, KeyboardEvent, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon, Loader2, Paperclip, X } from "lucide-react";
import { MessagingService } from "@/lib/services/messaging/index";
import { Message } from "@/lib/services/messaging/types";
import { useAuth } from "@/hooks/useAuth";
import { AttachmentUploader } from "./AttachmentUploader";
import { MessageReply } from "./MessageReply";
import { TaskMentionPicker } from "./TaskMentionPicker";
import { ProjectFilesPicker } from "./ProjectFilesPicker";
import { SuggestedReplies } from "./SuggestedReplies";
import { FolderKanban } from "lucide-react";

type ProjectSuggestion = {
    id: string;
    title?: string | null;
    name?: string | null;
    slug?: string | null;
};

interface MessageInputProps {
    conversationId: string;
    onSendMessage: (content: string, replyToMessageId?: string, attachments?: Array<{ file_url: string; file_name: string; file_type: string; file_size: number; mime_type?: string; thumbnail_url?: string }>, mentionedTaskIds?: string[]) => Promise<void>;
    isLoading?: boolean;
    replyTo?: Message | null;
    onCancelReply?: () => void;
    projectId?: string | null;
    showSuggestedReplies?: boolean;
    lastMessage?: Message | null;
}

export function MessageInput({
    conversationId,
    onSendMessage,
    isLoading,
    replyTo,
    onCancelReply,
    projectId,
    showSuggestedReplies = false,
    lastMessage
}: MessageInputProps) {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [showAttachments, setShowAttachments] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<Array<{ file_url: string; file_name: string; file_type: string; file_size: number; mime_type?: string; thumbnail_url?: string }>>([]);
    const [showProjectFiles, setShowProjectFiles] = useState(false);
    const [showTaskMentionPicker, setShowTaskMentionPicker] = useState(false);
    const [mentionedTaskIds, setMentionedTaskIds] = useState<string[]>([]);
    const [taskMentionQuery, setTaskMentionQuery] = useState("");
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypingStateRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // /project autocomplete
    const [showProjectMentions, setShowProjectMentions] = useState(false);
    const [projectQuery, setProjectQuery] = useState("");
    const [projectSuggestions, setProjectSuggestions] = useState<ProjectSuggestion[]>([]);
    const [projectSelectedIndex, setProjectSelectedIndex] = useState(0);
    const [projectSlashStart, setProjectSlashStart] = useState<number>(-1);
    const projectSearchCacheRef = useRef<Map<string, ProjectSuggestion[]>>(new Map());
    const projectSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const recentProjectsKey = "recent_project_mentions";

    const readRecentProjects = useCallback((): ProjectSuggestion[] => {
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem(recentProjectsKey);
            const parsed = raw ? (JSON.parse(raw) as Array<{ id?: string; slug?: string; title?: string }>) : [];
            return (Array.isArray(parsed) ? parsed : [])
                .map((p) => ({
                    id: p.id || p.slug || "",
                    slug: p.slug || null,
                    title: p.title || null
                }))
                .filter((p) => !!(p.slug || p.id));
        } catch {
            return [];
        }
    }, []);

    const writeRecentProject = useCallback((project: ProjectSuggestion) => {
        if (typeof window === "undefined") return;
        const token = project.slug || project.id;
        if (!token) return;
        try {
            const current = readRecentProjects();
            const next = [
                { id: project.id, slug: project.slug || token, title: project.title || project.name || token },
                ...current.filter((p) => (p.slug || p.id) !== token)
            ].slice(0, 6);
            window.localStorage.setItem(recentProjectsKey, JSON.stringify(next));
        } catch {
            // ignore
        }
    }, [readRecentProjects]);

    const detectProjectTrigger = useCallback((text: string, cursor: number) => {
        const before = text.slice(0, cursor);
        const match = before.match(/(?:^|\s)\/([A-Za-z0-9-]*)$/);
        if (!match) return null;
        const q = (match[1] || "").toLowerCase();
        const slashStart = cursor - q.length - 1;
        if (slashStart < 0) return null;
        return { query: q, slashStart };
    }, []);

    const insertProjectToken = useCallback((project: ProjectSuggestion) => {
        const token = project.slug || project.id;
        if (!token) return;
        const el = textareaRef.current;
        const cursor = el?.selectionStart ?? content.length;
        const start = projectSlashStart >= 0 ? projectSlashStart : cursor;
        const before = content.slice(0, start);
        const after = content.slice(cursor);
        const nextValue = `${before}/${token} ${after}`;
        setContent(nextValue);
        setShowProjectMentions(false);
        setProjectSuggestions([]);
        setProjectQuery("");
        setProjectSelectedIndex(0);
        setProjectSlashStart(-1);
        writeRecentProject({ ...project, slug: project.slug || token });

        setTimeout(() => {
            if (!el) return;
            el.focus();
            const nextCursor = before.length + token.length + 2; // "/" + token + space
            el.setSelectionRange(nextCursor, nextCursor);
        }, 0);
    }, [content, projectSlashStart, writeRecentProject]);

    // Mobile keyboard handling - adjust viewport when keyboard opens
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            // On mobile, scroll to bottom when keyboard opens
            if (window.innerHeight < 500) {
                setTimeout(() => {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }, 300);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Track typing status
    useEffect(() => {
        if (!user?.id || !conversationId) return;

        const hasContent = content.trim().length > 0;

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (hasContent && !lastTypingStateRef.current) {
            // User started typing
            lastTypingStateRef.current = true;
            MessagingService.setTyping(conversationId, user.id, true);
        }

        // Set timeout to stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            if (lastTypingStateRef.current) {
                lastTypingStateRef.current = false;
                MessagingService.setTyping(conversationId, user.id, false);
            }
        }, 3000);

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [content, conversationId, user?.id]);

    // Stop typing when message is sent
    useEffect(() => {
        if (!content.trim() && lastTypingStateRef.current && user?.id && conversationId) {
            lastTypingStateRef.current = false;
            MessagingService.setTyping(conversationId, user.id, false);
        }
    }, [content, conversationId, user?.id]);

    // Handle @task mention detection
    const handleContentChange = (value: string, cursor?: number) => {
        setContent(value);

        // Check for @task mention trigger
        if (projectId) {
            const match = value.match(/@task\s*$/);
            if (match) {
                setShowTaskMentionPicker(true);
                setTaskMentionQuery("");
            } else if (value.includes('@task ')) {
                const queryMatch = value.match(/@task\s+(.+)$/);
                if (queryMatch) {
                    setShowTaskMentionPicker(true);
                    setTaskMentionQuery(queryMatch[1] || "");
                } else {
                    setShowTaskMentionPicker(false);
                }
            } else {
                setShowTaskMentionPicker(false);
            }
        }

        // Check for /project mention trigger (works everywhere)
        const cursorPos = typeof cursor === "number" ? cursor : (textareaRef.current?.selectionStart ?? value.length);
        const trig = detectProjectTrigger(value, cursorPos);
        if (!trig) {
            setShowProjectMentions(false);
            setProjectSuggestions([]);
            setProjectQuery("");
            setProjectSelectedIndex(0);
            setProjectSlashStart(-1);
            return;
        }

        setShowProjectMentions(true);
        setProjectQuery(trig.query);
        setProjectSlashStart(trig.slashStart);
        setProjectSelectedIndex(0);
    };

    // Fetch project suggestions (debounced)
    useEffect(() => {
        if (!showProjectMentions) return;

        if (projectSearchTimeoutRef.current) {
            clearTimeout(projectSearchTimeoutRef.current);
        }

        // If query is empty, show recents
        if (!projectQuery) {
            setProjectSuggestions(readRecentProjects());
            return;
        }

        // Cache hit
        const cached = projectSearchCacheRef.current.get(projectQuery);
        if (cached) {
            setProjectSuggestions(cached);
            return;
        }

        projectSearchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/v1/search?type=projects&q=${encodeURIComponent(projectQuery)}`);
                const json = await res.json();
                const projects = (json?.data || []).filter((x: any) => x?.type === "project");
                const normalized: ProjectSuggestion[] = projects.map((p: any) => ({
                    id: p.id,
                    title: p.title || p.name || null,
                    name: p.name || p.title || null,
                    slug: p.slug || null
                })).filter((p: any) => p?.id);
                projectSearchCacheRef.current.set(projectQuery, normalized);
                setProjectSuggestions(normalized);
            } catch {
                setProjectSuggestions([]);
            }
        }, 200);

        return () => {
            if (projectSearchTimeoutRef.current) clearTimeout(projectSearchTimeoutRef.current);
        };
    }, [projectQuery, showProjectMentions, readRecentProjects]);

    const handleTaskSelect = (task: { id: string; title: string; status: string }) => {
        // Extract task IDs from content (format: @task:taskId)
        const taskIdPattern = /@task:([a-f0-9-]+)/g;
        const existingTaskIds = new Set<string>();
        let match;
        while ((match = taskIdPattern.exec(content)) !== null) {
            if (match[1]) existingTaskIds.add(match[1]);
        }

        // Add new task ID if not already mentioned
        if (!existingTaskIds.has(task.id)) {
            setMentionedTaskIds(prev => [...prev, task.id]);
        }

        // Replace @task or @task query with @task:taskId
        const newContent = content.replace(/@task.*$/, `@task:${task.id} `);
        setContent(newContent);
        setShowTaskMentionPicker(false);
        setTaskMentionQuery("");
        textareaRef.current?.focus();
    };

    const handleProjectFilesSelect = (files: Array<{ id: string; file_url: string; name: string; file_type?: string; file_size?: number; mime_type?: string }>) => {
        const fileAttachments = files.map(file => ({
            file_url: file.file_url,
            file_name: file.name,
            file_type: file.file_type || 'file',
            file_size: file.file_size || 0,
            mime_type: file.mime_type
        }));
        setPendingAttachments(prev => [...prev, ...fileAttachments]);
        setShowProjectFiles(false);
    };

    // Load draft
    useEffect(() => {
        const saved = localStorage.getItem(`msg_draft_${conversationId}`);
        if (saved) setContent(saved);
    }, [conversationId]);

    // Save draft
    useEffect(() => {
        if (content) {
            localStorage.setItem(`msg_draft_${conversationId}`, content);
        } else {
            localStorage.removeItem(`msg_draft_${conversationId}`);
        }
    }, [content, conversationId]);

    const handleSend = async () => {
        if ((!content.trim() && pendingAttachments.length === 0) || isLoading) return;

        // Stop typing indicator
        if (user?.id && conversationId) {
            lastTypingStateRef.current = false;
            await MessagingService.setTyping(conversationId, user.id, false);
        }

        // Extract mentioned task IDs from content
        const taskIdPattern = /@task:([a-f0-9-]+)/g;
        const extractedTaskIds: string[] = [];
        let match;
        while ((match = taskIdPattern.exec(content)) !== null) {
            if (match[1]) extractedTaskIds.push(match[1]);
        }
        // Also include any from state (in case they were added differently)
        const allTaskIds = Array.from(new Set([...extractedTaskIds, ...mentionedTaskIds]));

        const attachmentsToSend = pendingAttachments.length > 0 ? pendingAttachments : undefined;
        // Capture content before clearing
        const contentToSend = content.trim();

        // Clear state and draft immediately
        setContent("");
        localStorage.removeItem(`msg_draft_${conversationId}`);
        setPendingAttachments([]);
        setShowAttachments(false);
        setMentionedTaskIds([]);
        setTaskMentionQuery("");
        setShowTaskMentionPicker(false);
        onCancelReply?.();

        await onSendMessage(
            contentToSend || "",
            replyTo?.id || undefined,
            attachmentsToSend,
            allTaskIds.length > 0 ? allTaskIds : undefined
        );
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (showProjectMentions && projectSuggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setProjectSelectedIndex((prev) => Math.min(prev + 1, projectSuggestions.length - 1));
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setProjectSelectedIndex((prev) => Math.max(prev - 1, 0));
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                const chosen = projectSuggestions[projectSelectedIndex];
                if (chosen) insertProjectToken(chosen);
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setShowProjectMentions(false);
                return;
            }
        }
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 relative">
            {/* Suggested Replies */}
            {showSuggestedReplies && lastMessage && lastMessage.sender_id !== user?.id && !isLoading && (
                <SuggestedReplies
                    lastMessage={lastMessage}
                    onSelect={(suggestion) => {
                        setContent(suggestion);
                        textareaRef.current?.focus();
                    }}
                />
            )}

            {replyTo && (
                <div className="px-3 pt-2 pb-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 relative">
                    <MessageReply replyTo={replyTo} />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={onCancelReply}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}
            {showAttachments && (
                <div className="px-3 pt-2 border-b">
                    <AttachmentUploader
                        onFilesReady={(files) => {
                            setPendingAttachments(prev => [...prev, ...files]);
                            setShowAttachments(false);
                        }}
                        onFilesChange={() => {
                            // Files are managed internally by AttachmentUploader
                        }}
                        userId={user?.id}
                        maxFiles={5}
                    />
                </div>
            )}
            <div className="p-3 flex items-end gap-2 relative">
                {projectId && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowProjectFiles(true)}
                        className="flex-shrink-0 text-zinc-500 dark:text-zinc-400"
                        title="Share from project files"
                    >
                        <FolderKanban className="h-4 w-4" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAttachments(!showAttachments)}
                    className="flex-shrink-0 text-zinc-500 dark:text-zinc-400"
                >
                    <Paperclip className="h-4 w-4" />
                </Button>
                <div className="relative flex-1">
                    <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => handleContentChange(e.target.value, e.target.selectionStart)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="min-h-[40px] max-h-[120px] resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                        rows={1}
                    />
                    {showProjectMentions && projectSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-56 overflow-y-auto">
                            <div className="px-3 py-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="text-zinc-400">/</span>
                                Mention a project
                            </div>
                            {projectSuggestions.map((p, idx) => {
                                const token = p.slug || p.id;
                                return (
                                    <button
                                        key={`${p.id}-${token}`}
                                        type="button"
                                        onClick={() => insertProjectToken(p)}
                                        onMouseEnter={() => setProjectSelectedIndex(idx)}
                                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${idx === projectSelectedIndex
                                            ? "bg-blue-50 dark:bg-blue-900/20"
                                            : "hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-700/50"
                                            }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                {p.title || token}
                                            </div>
                                            <div className="text-xs text-zinc-500 truncate">
                                                /{token}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {/* Task Mention Picker */}
                    {showTaskMentionPicker && projectId && (
                        <TaskMentionPicker
                            projectId={projectId}
                            isOpen={showTaskMentionPicker}
                            onSelect={handleTaskSelect}
                            onClose={() => setShowTaskMentionPicker(false)}
                            searchQuery={taskMentionQuery}
                        />
                    )}
                </div>
                <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={(!content.trim() && pendingAttachments.length === 0) || isLoading}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                </Button>
            </div>
            {pendingAttachments.length > 0 && (
                <div className="px-3 pb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{pendingAttachments.length} file{pendingAttachments.length !== 1 ? 's' : ''} attached</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => setPendingAttachments([])}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* Project Files Picker */}
            {showProjectFiles && projectId && (
                <ProjectFilesPicker
                    projectId={projectId}
                    isOpen={showProjectFiles}
                    onSelect={handleProjectFilesSelect}
                    onClose={() => setShowProjectFiles(false)}
                />
            )}
        </div>
    );
}
