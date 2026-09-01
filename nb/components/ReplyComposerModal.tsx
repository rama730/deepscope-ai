"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import LinkPreview from "@/components/LinkPreview";
import AttachmentTray from "@/components/composer/AttachmentTray";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useAutosizeTextarea } from "@/hooks/useAutosizeTextarea";
import { useDraft } from "@/hooks/useDraft";
import { extractUrls } from "@/lib/text/extractUrls";

interface Post {
  id: string;
  content: string | null;
  created_at: string;
  user_id: string;
  media?: any;
  thread_root_id?: string | null;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface CommentModalProps {
  post: Post;
  parentComment?: any; // This is actually a Post (reply) now
  isOpen: boolean;
  onClose: () => void;
  onCommentPosted?: () => void;
}

type DraftShape = {
  comment: string;
  suppressedUrls: string[];
  previewHidden: boolean;
};

export default function ReplyComposerModal({ post, parentComment, isOpen, onClose, onCommentPosted }: CommentModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [comment, setComment] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<{
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [posting, setPosting] = useState(false);
  const [suppressedUrls, setSuppressedUrls] = useState<string[]>([]);
  const [previewHidden, setPreviewHidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    if (user?.id) {
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setCurrentProfile(data as any);
    }
  }

  async function handlePostComment() {
    if ((!comment.trim() && upload.files.length === 0) || !currentUser || posting) return;

    setPosting(true);
    setErrorMessage(null);
    try {
      const parentId = parentComment ? parentComment.id : post.id;
      // If we are replying to a parentComment, the root is likely post.id (if post is the root context) or post.thread_root_id.
      // If parentComment is present, 'post' might be the root post passed in context.
      // Safe bet: if post.thread_root_id exists, use it. Else use post.id.
      const threadRootId = post.thread_root_id || post.id;

      if (upload.files.some((f) => f.status === "error")) {
        setErrorMessage("Remove or retry failed attachments before posting.");
        setPosting(false);
        return;
      }

      const uploadedNow = await upload.uploadFiles();
      const merged = new Map<string, any>();
      [...upload.files, ...uploadedNow].forEach((f: any) => merged.set(f.id, f));
      const completedAll = Array.from(merged.values()).filter((f: any) => f.status === "completed" && !!f.url);

      let mediaPayload: any = null;
      if (completedAll.length > 0) {
        const imageItems = completedAll.filter((f) => (f.type || "").startsWith("image/"));
        const nonImages = completedAll.filter((f) => !(f.type || "").startsWith("image/"));

        if (nonImages.length === 0) {
          mediaPayload = { type: "image", urls: imageItems.map((f) => f.url) };
        } else {
          mediaPayload = {
            type: "attachments",
            items: completedAll.map((f) => ({
              kind: (f.type || "").startsWith("image/") ? "image" : "file",
              url: f.url,
              name: f.name,
              mime: f.type,
              size: f.size,
            })),
          };
        }
      }

      const { error } = await supabase.from('posts').insert({
        parent_post_id: parentId,
        thread_root_id: threadRootId,
        is_reply: true,
        user_id: currentUser.id,
        content: comment.trim() || "",
        media: mediaPayload,
        likes_count: 0,
        comments_count: 0,
        reposts_count: 0,
        views_count: 0
      });

      if (!error) {
        setComment("");
        draft.clear();
        upload.clearFiles();
        onCommentPosted?.();
        onClose();
      } else {
        console.error("Error posting comment:", JSON.stringify(error, null, 2));
        setErrorMessage((error as any)?.message || "Failed to post reply. Please try again.");
      }
    } catch (err) {
      console.error("Error posting comment:", err);
      setErrorMessage((err as any)?.message || "Failed to post reply. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  function getInitials(name?: string | null) {
    if (!name) return "U";
    return name.slice(0, 1).toUpperCase();
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

    return date.toLocaleDateString();
  }

  if (!isOpen) return null;

  const target = parentComment || post;
  const targetProfile = parentComment ? parentComment.profiles : post.profiles;
  const targetContent = parentComment ? parentComment.content : post.content;
  const targetDate = parentComment ? parentComment.created_at : post.created_at;
  const maxChars = 500;

  const parentId = parentComment ? parentComment.id : post.id;
  const threadRootId = post.thread_root_id || post.id;

  const upload = useFileUpload({
    allowedTypes: ["*/*"],
    maxFiles: 5,
    bucket: "post-media",
    pathPrefix: currentUser?.id ? `replies/${threadRootId}/${currentUser.id}` : "replies",
    generateThumbnails: true,
  });

  useAutosizeTextarea(textareaRef, comment, { maxHeight: 220 });

  const urls = useMemo(() => extractUrls(comment).slice(0, 5), [comment]);
  const activePreviewUrl = useMemo(() => {
    if (previewHidden) return null;
    for (const u of urls) {
      if (!suppressedUrls.includes(u)) return u;
    }
    return null;
  }, [urls, suppressedUrls, previewHidden]);

  const draftKey = currentUser?.id ? `reply_draft_${currentUser.id}_${parentId}` : null;
  const draftValue: DraftShape = { comment, suppressedUrls, previewHidden };
  const draft = useDraft<DraftShape>(draftKey || "reply_draft_pending", draftValue, {
    enabled: !!draftKey,
    debounceMs: 450,
    ttlMs: 7 * 24 * 60 * 60 * 1000,
    shouldSave: (v) => {
      const c = (v?.comment || "").trim();
      return c.length > 0 || upload.files.length > 0;
    },
  });

  useEffect(() => {
    if (!draft.restored) return;
    setComment(draft.restored.comment || "");
    setSuppressedUrls(Array.isArray(draft.restored.suppressedUrls) ? draft.restored.suppressedUrls : []);
    setPreviewHidden(!!draft.restored.previewHidden);
  }, [draft.restored]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-12 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold">Reply</h2>
          <div className="w-9"></div> {/* Spacer for center alignment */}
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {/* Target Post/Comment */}
          <div className="flex gap-3 mb-4 relative">
            {/* Vertical line to indicate thread */}
            <div className="absolute left-5 top-12 bottom-[-20px] w-0.5 bg-zinc-200 dark:bg-zinc-800"></div>

            <div className="flex flex-col items-center z-10">
              <Link href={`/profile/${target.user_id}`} onClick={onClose}>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 cursor-pointer hover:opacity-80">
                  {targetProfile?.avatar_url ? (
                    <Image
                      src={targetProfile.avatar_url}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    getInitials(targetProfile?.full_name || targetProfile?.username)
                  )}
                </div>
              </Link>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/profile/${target.user_id}`} className="font-semibold hover:underline text-sm" onClick={onClose}>
                  {targetProfile?.full_name || targetProfile?.username || 'User'}
                </Link>
                <Link href={`/profile/${target.user_id}`} className="text-zinc-500 dark:text-zinc-600 hover:underline text-sm" onClick={onClose}>
                  @{targetProfile?.username || 'user'}
                </Link>
                <span className="text-zinc-500 dark:text-zinc-600 text-sm">· {formatTimestamp(targetDate)}</span>
              </div>

              {targetContent && (
                <p className="mt-2 text-[15px] whitespace-pre-wrap break-words">{targetContent}</p>
              )}

              {/* Media preview (only for posts, comments usually don't have media yet or different structure) */}
              {!parentComment && post.media?.type === 'image' && Array.isArray(post.media?.urls) && post.media.urls.length > 0 && (
                <div className={`mt-3 grid gap-2 ${post.media.urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.media.urls.slice(0, 4).map((url: string, i: number) => (
                    <div key={i} className={`${post.media.urls.length === 3 && i === 0 ? 'col-span-2' : ''} relative overflow-hidden rounded-xl border h-48`}>
                      <Image
                        src={url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 text-sm text-zinc-500">
                Replying to <Link href={`/profile/${target.user_id}`} className="text-blue-500 hover:underline" onClick={onClose}>
                  @{targetProfile?.username || 'user'}
                </Link>
              </div>
            </div>
          </div>

          {/* Reply Input */}
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
              {(currentProfile?.avatar_url || currentUser?.user_metadata?.avatar_url) ? (
                <Image
                  src={(currentProfile?.avatar_url || currentUser?.user_metadata?.avatar_url) as string}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                getInitials(
                  currentProfile?.full_name ||
                  currentProfile?.username ||
                  currentUser?.user_metadata?.full_name ||
                  currentUser?.email
                )
              )}
            </div>

            <div className="flex-1 relative">
              <div className="rounded-2xl bg-zinc-200 dark:bg-zinc-800 p-[1px] transition-shadow focus-within:bg-gradient-to-br focus-within:from-blue-500 focus-within:to-purple-500 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.10)]">
                <div className="relative rounded-2xl bg-white dark:bg-zinc-900 px-3 pt-3 pb-12">
                  <textarea
                    ref={textareaRef}
                    value={comment}
                    onChange={(e) => {
                      const next = e.target.value.slice(0, maxChars);
                      setComment(next);
                    }}
                    placeholder="Post your reply"
                    className="w-full min-h-[96px] bg-transparent outline-none resize-none placeholder:text-zinc-500 text-[15px] leading-relaxed pr-2"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handlePostComment();
                      }
                    }}
                  />

                  {/* Floating action rail */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/40 backdrop-blur px-1 py-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const fl = e.target.files;
                          if (fl && fl.length > 0) {
                            upload.addFiles(fl);
                          }
                          e.currentTarget.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-full text-blue-500 transition-colors"
                        aria-label="Attach files"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>

                    <button
                      onClick={handlePostComment}
                      disabled={(!comment.trim() && upload.files.length === 0) || posting || comment.length > maxChars}
                      className="h-9 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
                    >
                      {posting ? (upload.uploading ? "Uploading..." : "Posting...") : "Reply"}
                    </button>
                  </div>

                  {/* Character count */}
                  {comment.length > 0 && (
                    <div className="absolute bottom-3 left-3 text-xs text-zinc-500 flex items-center gap-2">
                      <span className={comment.length > maxChars * 0.9 ? "text-red-500" : ""}>
                        {comment.length} / {maxChars}
                      </span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-zinc-400">
                        {(typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac")) ? "⌘ Enter" : "Ctrl Enter"} to send
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments */}
              <AttachmentTray files={upload.files} onRemove={upload.removeFile} onRetry={upload.retryFile} />

              {/* Link preview controls */}
              {urls.length > 0 && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {urls.map((u) => {
                      const isSuppressed = suppressedUrls.includes(u);
                      let label = u;
                      try {
                        label = new URL(u).hostname.replace("www.", "");
                      } catch {
                        // ignore
                      }
                      return (
                        <button
                          key={u}
                          type="button"
                          onClick={() => {
                            setSuppressedUrls((prev) =>
                              prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]
                            );
                          }}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${isSuppressed
                              ? "border-zinc-200 dark:border-zinc-800 text-zinc-400"
                              : "border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            }`}
                          title={u}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewHidden((v) => !v)}
                    className="text-xs px-2 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors text-zinc-600 dark:text-zinc-300"
                  >
                    {previewHidden ? "Show preview" : "Hide preview"}
                  </button>
                </div>
              )}

              {/* Link preview (animated in) */}
              {activePreviewUrl && (
                <div className="mt-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <div className="relative">
                    <LinkPreview url={activePreviewUrl} />
                    <button
                      type="button"
                      onClick={() =>
                        setSuppressedUrls((prev) =>
                          prev.includes(activePreviewUrl) ? prev : [...prev, activePreviewUrl]
                        )
                      }
                      className="absolute top-2 right-2 rounded-full bg-white/90 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 backdrop-blur px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-950 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {errorMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
