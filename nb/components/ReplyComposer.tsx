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
  content: string;
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

interface Props {
  parentPost: Post;
  onClose: () => void;
  onPosted?: () => void;
}

type DraftShape = {
  content: string;
  suppressedUrls: string[];
  previewHidden: boolean;
};

export default function ReplyComposer({ parentPost, onClose, onPosted }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [content, setContent] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<{
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [posting, setPosting] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [suppressedUrls, setSuppressedUrls] = useState<string[]>([]);
  const [previewHidden, setPreviewHidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const maxChars = 500;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoMentionedRef = useRef(false);

  const threadRootId = (parentPost as any).thread_root_id || parentPost.id;

  const upload = useFileUpload({
    allowedTypes: ["*/*"],
    maxFiles: 5,
    // Keep aligned with existing bucket/policies for posts
    bucket: "post-media",
    pathPrefix: currentUser?.id ? `replies/${threadRootId}/${currentUser.id}` : "replies",
    generateThumbnails: true,
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Detect @mention typing
    const match = content.match(/@(\w*)$/);
    if (match) {
      const query = match[1] || "";
      if (query.length > 0) {
        searchUsers(query);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, [content]);

  useAutosizeTextarea(textareaRef, content, { maxHeight: 220 });

  const urls = useMemo(() => extractUrls(content).slice(0, 5), [content]);
  const activePreviewUrl = useMemo(() => {
    if (previewHidden) return null;
    for (const u of urls) {
      if (!suppressedUrls.includes(u)) return u;
    }
    return null;
  }, [urls, suppressedUrls, previewHidden]);

  const draftKey = currentUser?.id ? `reply_draft_${currentUser.id}_${parentPost.id}` : null;
  const draftValue: DraftShape = { content, suppressedUrls, previewHidden };
  const draft = useDraft<DraftShape>(draftKey || "reply_draft_pending", draftValue, {
    enabled: !!draftKey,
    debounceMs: 450,
    ttlMs: 7 * 24 * 60 * 60 * 1000,
    shouldSave: (v) => {
      const c = (v?.content || "").trim();
      return c.length > 0 || upload.files.length > 0;
    },
  });

  useEffect(() => {
    if (!draft.restored) return;
    setContent(draft.restored.content || "");
    setSuppressedUrls(Array.isArray(draft.restored.suppressedUrls) ? draft.restored.suppressedUrls : []);
    setPreviewHidden(!!draft.restored.previewHidden);
  }, [draft.restored]);

  useEffect(() => {
    if (autoMentionedRef.current) return;
    if (draft.restored) return; // don't override restored draft
    const username = parentPost.profiles?.username;
    if (!username) return;
    if (content.trim().length > 0) return;
    autoMentionedRef.current = true;
    setContent(`@${username} `);
  }, [draft.restored, parentPost.profiles?.username, content]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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

  async function searchUsers(query: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .ilike('username', `${query}%`)
      .limit(5);

    if (data && data.length > 0) {
      setMentionSuggestions(data);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }

  function insertMention(username: string) {
    const newContent = content.replace(/@\w*$/, `@${username} `);
    setContent(newContent);
    setShowMentions(false);
  }

  async function handlePost() {
    if ((!content.trim() && upload.files.length === 0) || !currentUser || posting) return;

    setPosting(true);
    setErrorMessage(null);
    try {
      // Upload attachments (if any)
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

        // If ALL are images, keep backwards-compatible image payload
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

      // Extract mentions
      const mentionMatches = content.match(/@(\w+)/g) || [];
      const mentionedUsernames = mentionMatches.map(m => m.slice(1));

      // Get user IDs for mentions
      let mentionedUserIds: string[] = [];
      if (mentionedUsernames.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id')
          .in('username', mentionedUsernames);
        mentionedUserIds = (users || []).map((u: any) => u.id);
      }

      // Create reply post
      let { data: newPost, error: insertErr } = await supabase
        .from('posts')
        .insert({
          content: content.trim(),
          user_id: currentUser.id,
          parent_post_id: parentPost.id,
          thread_root_id: threadRootId,
          is_reply: true,
          post_type: 'standard',
          mentioned_user_ids: mentionedUserIds.length > 0 ? mentionedUserIds : null,
          media: mediaPayload,
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('Insert reply failed raw:', insertErr);
        try { console.error('Insert reply failed json:', JSON.stringify(insertErr)); } catch { }
        console.error('Insert reply failed:', {
          message: (insertErr as any)?.message,
          details: (insertErr as any)?.details,
          hint: (insertErr as any)?.hint,
          code: (insertErr as any)?.code,
        });
        // Fallback: try without thread_root_id and mentioned_user_ids (in case migration 0017 not applied yet)
        const { data: retryPost, error: retryErr } = await supabase
          .from('posts')
          .insert({
            content: content.trim(),
            user_id: currentUser.id,
            parent_post_id: parentPost.id,
            is_reply: true,
            post_type: 'standard',
          })
          .select('id')
          .single();
        if (retryErr) {
          console.error('Insert reply retry failed raw:', retryErr);
          try { console.error('Insert reply retry failed json:', JSON.stringify(retryErr)); } catch { }
          console.error('Insert reply retry failed:', {
            message: (retryErr as any)?.message,
            details: (retryErr as any)?.details,
            hint: (retryErr as any)?.hint,
            code: (retryErr as any)?.code,
          });
          throw retryErr;
        }
        newPost = retryPost;
      }

      // Create mention records for notifications
      if (newPost && mentionedUserIds.length > 0) {
        const { error: mentionErr } = await supabase.from('post_mentions').insert(
          mentionedUserIds.map(uid => ({
            post_id: newPost.id,
            mentioned_user_id: uid,
          }))
        );
        if (mentionErr) {
          console.error('Mention creation failed:', {
            message: (mentionErr as any)?.message,
            details: (mentionErr as any)?.details,
            hint: (mentionErr as any)?.hint,
            code: (mentionErr as any)?.code,
          });
        }
      }

      onPosted?.();
      draft.clear();
      upload.clearFiles();
      onClose();
    } catch (err) {
      console.error("Error posting reply:", err);
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

    return date.toLocaleDateString("en-US");
  }

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
          <div className="w-9"></div>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {/* Parent Post */}
          <div className="flex gap-3 mb-4">
            <div className="flex flex-col items-center">
              <Link href={`/profile/${parentPost.user_id}`} onClick={onClose}>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 cursor-pointer hover:opacity-80">
                  {parentPost.profiles?.avatar_url ? (
                    <Image
                      src={parentPost.profiles.avatar_url}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    getInitials(parentPost.profiles?.full_name || parentPost.profiles?.username)
                  )}
                </div>
              </Link>
              <div className="w-0.5 flex-1 bg-zinc-300 dark:bg-zinc-700 mt-2"></div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/profile/${parentPost.user_id}`} className="font-semibold hover:underline text-sm" onClick={onClose}>
                  {parentPost.profiles?.full_name || parentPost.profiles?.username || 'User'}
                </Link>
                <Link href={`/profile/${parentPost.user_id}`} className="text-zinc-500 dark:text-zinc-600 hover:underline text-sm" onClick={onClose}>
                  @{parentPost.profiles?.username || 'user'}
                </Link>
                <span className="text-zinc-500 dark:text-zinc-600 text-sm">· {formatTimestamp(parentPost.created_at)}</span>
              </div>

              {parentPost.content && (
                <p className="mt-2 text-[15px] whitespace-pre-wrap break-words">{parentPost.content}</p>
              )}

              {/* Parent media preview */}
              {parentPost.media?.type === 'image' && Array.isArray(parentPost.media?.urls) && parentPost.media.urls.length > 0 && (
                <div className={`mt-3 grid gap-2 ${parentPost.media.urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {parentPost.media.urls.slice(0, 2).map((url: string, i: number) => (
                    <div key={i} className="relative overflow-hidden rounded-xl border h-32">
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
                Replying to <Link href={`/profile/${parentPost.user_id}`} className="text-blue-500 hover:underline" onClick={onClose}>
                  @{parentPost.profiles?.username || 'user'}
                </Link>
              </div>
            </div>
          </div>

          {/* Reply Input */}
          <div className="flex gap-3 relative">
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
                    value={content}
                    onChange={(e) => {
                      const next = e.target.value.slice(0, maxChars);
                      setContent(next);
                    }}
                    placeholder="Post your reply"
                    className="w-full min-h-[96px] bg-transparent outline-none resize-none placeholder:text-zinc-500 text-[15px] leading-relaxed pr-2"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handlePost();
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
                      onClick={handlePost}
                      disabled={(!content.trim() && upload.files.length === 0) || posting || content.length > maxChars}
                      className="h-9 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
                    >
                      {posting ? (upload.uploading ? "Uploading..." : "Posting...") : "Reply"}
                    </button>
                  </div>

                  {/* Character count */}
                  {content.length > 0 && (
                    <div className="absolute bottom-3 left-3 text-xs text-zinc-500 flex items-center gap-2">
                      <span className={content.length > maxChars * 0.9 ? "text-red-500" : ""}>
                        {content.length} / {maxChars}
                      </span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-zinc-400">
                        {(typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac")) ? "⌘ Enter" : "Ctrl Enter"} to send
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mention autocomplete */}
              {showMentions && mentionSuggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {mentionSuggestions.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => insertMention(user.username)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 text-left"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs text-white">
                        {user.avatar_url ? (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden">
                            <Image
                              src={user.avatar_url}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          getInitials(user.full_name || user.username)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{user.full_name || user.username}</div>
                        <div className="text-xs text-zinc-500">@{user.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Attachments */}
              <AttachmentTray
                files={upload.files}
                onRemove={upload.removeFile}
                onRetry={upload.retryFile}
              />

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
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                            isSuppressed
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

              {/* Error */}
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

