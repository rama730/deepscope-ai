"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { X, Plus, Trash2, GripVertical } from "lucide-react";

interface ThreadPost {
  id: string;
  content: string;
}

interface ThreadComposerProps {
  onClose: () => void;
  onPublish?: () => void;
}

export default function ThreadComposer({
  onClose,
  onPublish,
}: ThreadComposerProps) {
  const supabase = createSupabaseBrowserClient();
  const [posts, setPosts] = useState<ThreadPost[]>([
    { id: crypto.randomUUID(), content: "" },
    { id: crypto.randomUUID(), content: "" },
  ]);
  const [publishing, setPublishing] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentionsFor, setShowMentionsFor] = useState<string | null>(null);
  const maxChars = 280;

  function addPost() {
    setPosts([...posts, { id: crypto.randomUUID(), content: "" }]);
  }

  function removePost(id: string) {
    if (posts.length > 1) {
      setPosts(posts.filter((p) => p.id !== id));
    }
  }

  function updatePost(id: string, content: string) {
    setPosts(posts.map((p) => (p.id === id ? { ...p, content } : p)));
    const match = content.match(/@([A-Za-z0-9_]*)$/);
    if (match) {
      const query = match[1];
      if (query.length > 0) {
        searchUsers(query);
        setShowMentionsFor(id);
      } else {
        setShowMentionsFor(null);
      }
    } else {
      setShowMentionsFor(null);
    }
  }

  async function searchUsers(query: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .ilike('username', `${query}%`)
      .limit(5);
    setMentionSuggestions(data || []);
  }

  function insertMention(targetPostId: string, username: string) {
    setPosts(posts.map((p) => (
      p.id === targetPostId
        ? { ...p, content: p.content.replace(/@[A-Za-z0-9_]*$/, `@${username} `) }
        : p
    )));
    setShowMentionsFor(null);
  }

  async function publishThread() {
    // Validate
    const validPosts = posts.filter((p) => p.content.trim());
    if (validPosts.length === 0) {
      alert("Please add some content to your thread");
      return;
    }

    setPublishing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the thread
      let threadRootId: string | null = null;
      let previousPostId: string | null = null;

      for (let i = 0; i < validPosts.length; i++) {
        const post = validPosts[i];

        const { data: newPost, error } = await supabase
          .from("posts")
          .insert({
            content: post.content.trim(),
            user_id: user.id,
            parent_post_id: previousPostId,
            thread_root_id: threadRootId || undefined,
            is_reply: i > 0,
          })
          .select()
          .single() as any;

        if (error) throw error;

        if (i === 0) {
          threadRootId = newPost.id;
        }
        previousPostId = newPost.id;

        // Update thread_root_id for the first post
        if (i === 0) {
          await supabase
            .from("posts")
            .update({ thread_root_id: threadRootId })
            .eq("id", newPost.id);
        }
      }

      onPublish?.();
      onClose();
    } catch (error: any) {
      console.error("Error publishing thread:", error);
      alert("Failed to publish thread: " + error.message);
    } finally {
      setPublishing(false);
    }
  }

  const totalChars = posts.reduce((sum, p) => sum + p.content.length, 0);
  const canPublish = posts.some((p) => p.content.trim()) && !publishing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Create Thread</h3>
          <button
            onClick={onClose}
            disabled={publishing}
            className="p-1 hover:bg-zinc-100 dark:bg-zinc-900 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Thread Posts */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {posts.map((post, index) => (
            <div key={post.id} className="relative">
              {/* Thread Line */}
              {index < posts.length - 1 && (
                <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-zinc-200" />
              )}

              <div className="flex gap-3">
                {/* Number Badge */}
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                </div>

                {/* Post Content */}
                <div className="flex-1">
                  <textarea
                    value={post.content}
                    onChange={(e) => updatePost(post.id, e.target.value)}
                    placeholder={
                      index === 0
                        ? "Start your thread..."
                        : `Continue your thread (${index + 1}/${posts.length})`
                    }
                    maxLength={maxChars}
                    rows={4}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showMentionsFor === post.id && mentionSuggestions.length > 0 && (
                    <div className="mt-1 border rounded-lg bg-white dark:bg-zinc-900 max-h-40 overflow-y-auto">
                      {mentionSuggestions.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => insertMention(post.id, user.username)}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:bg-zinc-900 flex items-center gap-2"
                        >
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs flex items-center justify-center">
                            {(user.full_name || user.username)?.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{user.full_name || user.username}</div>
                            <div className="text-xs text-zinc-500 truncate">@{user.username}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-xs ${post.content.length > maxChars * 0.9
                          ? "text-red-600"
                          : "text-zinc-500"
                        }`}
                    >
                      {post.content.length} / {maxChars}
                    </span>
                    {posts.length > 1 && (
                      <button
                        onClick={() => removePost(post.id)}
                        disabled={publishing}
                        className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Post Button */}
          {posts.length < 25 && (
            <button
              onClick={addPost}
              disabled={publishing}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add another post</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {posts.filter((p) => p.content.trim()).length} of {posts.length} posts have content
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={publishing}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={publishThread}
              disabled={!canPublish}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? "Publishing..." : "Publish Thread"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


