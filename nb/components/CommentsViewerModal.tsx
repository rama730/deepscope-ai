"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { profileHref } from "@/lib/routing/identifiers";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_post_id: string | null;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface CommentsModalProps {
  postId: string;
  onClose: () => void;
  onCommentPosted?: () => void;
}

export default function CommentsViewerModal({ postId, onClose, onCommentPosted }: CommentsModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser();
    loadComments();
  }, [postId]);

  // Real-time subscription
  useEffect(() => {
    if (!postId) return;

    // We subscribe to all posts that are replies to this root post (or any descendant if we wanted, but sticking to logic)
    // Actually, getting all descendants via realtime is tricky without filtering by thread_root_id.
    // Let's listen to everything with thread_root_id = postId (if postId is root) OR parent_post_id = postId.
    // Simplest for now: listen to inserts with parent_post_id = postId (direct replies)
    // But wait, the modal shows nested replies? The logic creates a tree.
    // If we want nested replies to show up real-time, we need to listen to all posts where thread_root_id = postId.

    // We don't have thread_root_id easily here without fetching the post first.
    // But we know parent_post_id. For direct replies it matches.
    // For nested replies, parent_post_id is another comment ID.
    // The previous implementation listened to `post_id=eq.${postId}` on `post_comments`.
    // We should listen to `parent_post_id=eq.${postId}` for direct, and maybe we miss nested ones unless we load structure.
    // Given the previous code just did `post_id`, it implies strict hierarchy or fetching all comments for a post.
    // In `posts` table, `thread_root_id` is the top level post.

    // Let's assume postId passed here is the ROOT post.
    const channel = supabase
      .channel(`comments-modal-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `thread_root_id=eq.${postId}`,
        },
        handleRealtimeUpdate
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public", // Also listen for direct replies which might not have thread_root_id set if logic fails, but they should.
          table: "posts",
          filter: `parent_post_id=eq.${postId}`,
        },
        handleRealtimeUpdate
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "posts",
          filter: `thread_root_id=eq.${postId}`,
        },
        (payload) => {
          // Handle delete
          setComments((prev) => removeCommentFromTree(prev, payload.old.id));
          onCommentPosted?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, supabase, onCommentPosted]);

  async function handleRealtimeUpdate(payload: any) {
    if (!payload.new.is_reply) return; // Ignore if not reply

    const { data } = await supabase
      .from('posts')
      .select(`
            id,
            content,
            created_at,
            user_id,
            parent_post_id,
            profiles:user_id (
            username,
            full_name,
            avatar_url
            )
        `)
      .eq('id', payload.new.id)
      .single();

    if (data) {
      setComments(prev => addCommentToTree(prev, data as any));
      onCommentPosted?.();
    }
  }


  async function loadCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  async function loadComments() {
    setLoading(true);

    // Fetch all replies in the thread (simplification: fetching all descendants if possible, 
    // or just direct ones depending on desired depth. The previous code fetched all comments for post_id).
    // So we fetch where thread_root_id = postId OR parent_post_id = postId (direct).

    const { data } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        user_id,
        parent_post_id,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        )
      `)
      .or(`thread_root_id.eq.${postId},parent_post_id.eq.${postId}`)
      .eq('is_reply', true)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(buildCommentTree(data));
    }

    setLoading(false);
  }

  function buildCommentTree(flatComments: any[]) {
    const map = new Map<string, Comment>();
    const roots: Comment[] = [];

    flatComments.forEach(c => {
      map.set(c.id, { ...c, replies: [] });
    });

    flatComments.forEach(c => {
      const node = map.get(c.id)!;
      if (c.parent_post_id && c.parent_post_id !== postId && map.has(c.parent_post_id)) {
        // It's a nested reply (parent is another comment)
        map.get(c.parent_post_id)!.replies!.push(node);
      } else {
        // Direct reply to the main post
        roots.push(node);
      }
    });
    return roots;
  }

  function addCommentToTree(prevComments: Comment[], newComment: Comment): Comment[] {
    // Re-flatten and Re-build is easiest way to ensure consistency
    const flatten = (nodes: Comment[]): Comment[] => {
      let res: Comment[] = [];
      nodes.forEach(n => {
        res.push(n);
        if (n.replies) res = res.concat(flatten(n.replies));
      });
      return res;
    };

    const distinct = new Map<string, Comment>();
    flatten(prevComments).forEach(c => distinct.set(c.id, c));
    distinct.set(newComment.id, { ...newComment, replies: [] });

    // We need raw data to rebuild
    const raw = Array.from(distinct.values()).map(c => ({
      ...c,
      replies: undefined // Clear replies to rebuild
    }));

    return buildCommentTree(raw);
  }

  function removeCommentFromTree(prevComments: Comment[], deletedId: string): Comment[] {
    return prevComments.filter(c => c.id !== deletedId).map(c => ({
      ...c,
      replies: c.replies ? removeCommentFromTree(c.replies, deletedId) : []
    }));
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    const { error } = await supabase.from('posts').insert({
      parent_post_id: postId,
      thread_root_id: postId,
      is_reply: true,
      user_id: currentUser.id,
      content: newComment.trim(),
    });

    if (error) {
      console.error('Error posting comment:', error);
      alert(`Failed to post comment: ${error.message}`);
      return;
    }

    setNewComment("");
    onCommentPosted?.();
  }

  async function handlePostReply(commentId: string) {
    if (!replyContent.trim() || !currentUser) return;

    const { error } = await supabase.from('posts').insert({
      parent_post_id: commentId,
      thread_root_id: postId, // Assuming postId is root
      is_reply: true,
      user_id: currentUser.id,
      content: replyContent.trim(),
    });

    if (error) {
      console.error('Error posting reply:', error);
      alert(`Failed to post reply: ${error.message}`);
      return;
    }

    setReplyContent("");
    setReplyingTo(null);
    onCommentPosted?.();
  }

  async function handleDeleteComment(commentId: string) {
    if (!currentUser) return;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', commentId)
      .eq('user_id', currentUser.id);

    if (error) {
      console.error('Error deleting comment:', error);
      alert(`Failed to delete comment: ${error.message}`);
      return;
    }
    onCommentPosted?.();
  }

  function getInitials(comment: Comment) {
    const name = comment.profiles?.full_name || comment.profiles?.username || "U";
    return name[0]?.toUpperCase();
  }

  function getDisplayName(comment: Comment) {
    return comment.profiles?.full_name || comment.profiles?.username || "User";
  }

  function getUsername(comment: Comment) {
    return comment.profiles?.username || "user";
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString("en-US");
  }

  function renderComment(comment: Comment, depth: number = 0) {
    const authorHref = profileHref({ id: comment.user_id, username: comment.profiles?.username });
    return (
      <div key={comment.id} className={depth > 0 ? "ml-12 mt-3" : "mt-3"}>
        <div className="flex gap-3">
          <Link href={authorHref}>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 cursor-pointer hover:opacity-80">
              {getInitials(comment)}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={authorHref} className="font-semibold text-sm hover:underline">
                {getDisplayName(comment)}
              </Link>
              <Link href={authorHref} className="text-zinc-500 dark:text-zinc-600 text-sm hover:underline">
                @{getUsername(comment)}
              </Link>
              <span className="text-zinc-500 dark:text-zinc-600 text-sm">
                · {formatTimestamp(comment.created_at)}
              </span>
            </div>

            <p className="mt-1 text-sm whitespace-pre-wrap break-words">
              {comment.content}
            </p>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="text-xs text-zinc-500 hover:text-blue-500 font-medium"
              >
                Reply
              </button>

              {currentUser?.id === comment.user_id && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-xs text-zinc-500 hover:text-red-500 font-medium"
                >
                  Delete
                </button>
              )}
            </div>

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to @${getUsername(comment)}...`}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  autoFocus
                />
                <button
                  onClick={() => handlePostReply(comment.id)}
                  disabled={!replyContent.trim()}
                  className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reply
                </button>
                <button
                  onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                  className="px-3 py-2 text-sm border rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Render Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold">Comments</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-zinc-500 py-8">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              <p className="mb-2">No comments yet</p>
              <p className="text-sm">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {comments.map((comment) => renderComment(comment))}
            </div>
          )}
        </div>

        {/* Comment Input */}
        {currentUser && (
          <form onSubmit={handlePostComment} className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 flex-shrink-0 bg-white dark:bg-zinc-900">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
              {GetInitialsSimple(currentUser)}
            </div>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Post
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function GetInitialsSimple(user: any) {
  const name = user?.user_metadata?.full_name || user?.email || "U";
  return name[0]?.toUpperCase();
}
