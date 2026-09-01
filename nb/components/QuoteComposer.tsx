"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  media?: any;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Props {
  quotedPost: Post;
  onClose: () => void;
  onPosted?: () => void;
}

export default function QuoteComposer({ quotedPost, onClose, onPosted }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [content, setContent] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posting, setPosting] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const maxChars = 500;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Detect @mention typing
    const match = content.match(/@(\w*)$/);
    if (match) {
      const query = match[1];
      if (query.length > 0) {
        searchUsers(query);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, [content]);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
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
    if (!content.trim() || !currentUser || posting) return;

    setPosting(true);
    try {
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

      // Create quote retweet
      const { data: newPost, error } = await supabase.from('posts').insert({
        content: content.trim(),
        user_id: currentUser.id,
        quoted_post_id: quotedPost.id,
        is_quote: true,
        mentioned_user_ids: mentionedUserIds.length > 0 ? mentionedUserIds : null,
      }).select('id').single();

      if (error) throw error;

      // Create mention records
      if (newPost && mentionedUserIds.length > 0) {
        await supabase.from('post_mentions').insert(
          mentionedUserIds.map(uid => ({
            post_id: newPost.id,
            mentioned_user_id: uid,
          }))
        );
      }

      onPosted?.();
      onClose();
    } catch (err) {
      console.error("Error posting quote:", err);
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
          <h2 className="text-lg font-semibold">Quote</h2>
          <div className="w-9"></div>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {/* Your comment */}
          <div className="flex gap-3 mb-4 relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
              {currentUser?.user_metadata?.avatar_url ? (
                <Image
                  src={currentUser.user_metadata.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                getInitials(currentUser?.user_metadata?.full_name || currentUser?.email)
              )}
            </div>

            <div className="flex-1 relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, maxChars))}
                placeholder="Add a comment..."
                className="w-full px-0 py-3 text-[15px] bg-transparent outline-none resize-none placeholder:text-zinc-500"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handlePost();
                  }
                }}
              />

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

              {/* Character count */}
              {content.length > 0 && (
                <div className="text-xs text-zinc-500 mt-2">
                  <span className={content.length > maxChars * 0.9 ? "text-red-500" : ""}>{content.length} / {maxChars}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quoted Post Preview */}
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
            <div className="flex gap-2">
              <Link href={`/profile/${quotedPost.user_id}`} onClick={onClose}>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 cursor-pointer hover:opacity-80">
                  {quotedPost.profiles?.avatar_url ? (
                    <Image
                      src={quotedPost.profiles.avatar_url}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    getInitials(quotedPost.profiles?.full_name || quotedPost.profiles?.username)
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <Link href={`/profile/${quotedPost.user_id}`} className="font-semibold hover:underline text-sm" onClick={onClose}>
                    {quotedPost.profiles?.full_name || quotedPost.profiles?.username || 'User'}
                  </Link>
                  <Link href={`/profile/${quotedPost.user_id}`} className="text-zinc-500 dark:text-zinc-600 hover:underline text-xs" onClick={onClose}>
                    @{quotedPost.profiles?.username || 'user'}
                  </Link>
                  <span className="text-zinc-500 dark:text-zinc-600 text-xs">· {formatTimestamp(quotedPost.created_at)}</span>
                </div>

                {quotedPost.content && (
                  <p className="mt-1 text-sm whitespace-pre-wrap break-words line-clamp-3">{quotedPost.content}</p>
                )}

                {/* Quoted media preview */}
                {quotedPost.media?.type === 'image' && Array.isArray(quotedPost.media?.urls) && quotedPost.media.urls.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {quotedPost.media.urls.slice(0, 2).map((url: string, i: number) => (
                      <div key={i} className="relative overflow-hidden rounded-lg border h-20">
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
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handlePost}
            disabled={!content.trim() || posting || content.length > maxChars}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {posting ? "Posting..." : "Quote"}
          </button>
        </div>
      </div>
    </div>
  );
}

