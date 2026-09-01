"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  MoreHorizontal,
  Trash2,
  Edit3,
  Flag,
  VolumeX,
  Ban,
  Link2,
  Code,
  PieChart,
  EyeOff,
  Pin,
  Clock,
  Share2,
  Twitter,
  Linkedin,
} from "lucide-react";
import { useToast } from "@/components/ui-custom/Toast";

interface PostMenuProps {
  postId: string;
  userId: string;
  currentUserId?: string;
  isOwnPost: boolean;
  isPinned?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onViewAnalytics?: () => void;
  onViewEditHistory?: () => void;
}

export default function PostMenu({
  postId,
  userId,
  currentUserId,
  isOwnPost,
  isPinned,
  onEdit,
  onDelete,
  onPin,
  onViewAnalytics,
  onViewEditHistory,
}: PostMenuProps) {
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [reportReason, setReportReason] = useState("");

  async function handleMuteUser() {
    if (!currentUserId) return;

    const { error } = await supabase.from("mutes").insert({
      muter_id: currentUserId,
      muted_id: userId,
    });

    if (!error) {
      showToast("User muted. You won't see their posts in your feed.", "success");
      setMenuOpen(false);
    }
  }

  async function handleBlockUser() {
    if (!currentUserId || !confirm("Are you sure you want to block this user?"))
      return;

    const { error } = await supabase.from("blocks").insert({
      blocker_id: currentUserId,
      blocked_id: userId,
    });

    if (!error) {
      showToast("User blocked. They won't be able to interact with you.", "success");
      setMenuOpen(false);
      window.location.reload();
    }
  }

  async function handleNotInterested() {
    if (!currentUserId) return;

    const { error } = await supabase.from("not_interested").insert({
      user_id: currentUserId,
      post_id: postId,
      reason: "not_relevant",
    });

    if (!error) {
      showToast("Thanks for your feedback. You'll see less content like this.", "success");
      setMenuOpen(false);
      window.location.reload();
    }
  }

  async function handleReport() {
    if (!currentUserId || !reportReason) return;

    const { error } = await supabase.from("post_reports").insert({
      post_id: postId,
      reporter_id: currentUserId,
      reason: reportReason,
    });

    if (!error) {
      showToast("Report submitted. We'll review this content.", "success");
      setShowReportModal(false);
      setMenuOpen(false);
    }
  }

  function copyPostLink() {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
    showToast("Link copied to clipboard!", "success");
    setMenuOpen(false);
  }

  function shareToTwitter() {
    const url = `${window.location.origin}/post/${postId}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
    setShowShareMenu(false);
    setMenuOpen(false);
  }

  function shareToLinkedIn() {
    const url = `${window.location.origin}/post/${postId}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedInUrl, "_blank", "width=550,height=420");
    setShowShareMenu(false);
    setMenuOpen(false);
  }

  function shareViaWebShare() {
    if (navigator.share) {
      navigator.share({
        title: "Check out this post",
        url: `${window.location.origin}/post/${postId}`,
      });
      setShowShareMenu(false);
      setMenuOpen(false);
    }
  }

  function copyEmbedCode() {
    const embedCode = `<iframe src="${window.location.origin}/embed/post/${postId}" width="550" height="400" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    showToast("Embed code copied to clipboard!", "success");
    setMenuOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className="p-1 hover:bg-zinc-100 dark:bg-zinc-900 rounded-full transition-colors"
      >
        <MoreHorizontal className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-20">
            {isOwnPost ? (
              <>
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit post
                  </button>
                )}
                {onPin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin();
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3"
                  >
                    <Pin className="w-4 h-4" />
                    {isPinned ? "Unpin from profile" : "Pin to profile"}
                  </button>
                )}
                {onViewAnalytics && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewAnalytics();
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3"
                  >
                    <PieChart className="w-4 h-4" />
                    View analytics
                  </button>
                )}
                {onViewEditHistory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewEditHistory();
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3"
                  >
                    <Clock className="w-4 h-4" />
                    View edit history
                  </button>
                )}
                <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this post?")) {
                        onDelete();
                      }
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete post
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNotInterested();
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3"
                >
                  <EyeOff className="w-4 h-4" />
                  Not interested
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMuteUser();
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3"
                >
                  <VolumeX className="w-4 h-4" />
                  Mute user
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBlockUser();
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3 text-red-600"
                >
                  <Ban className="w-4 h-4" />
                  Block user
                </button>
                <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReportModal(true);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3 text-red-600"
                >
                  <Flag className="w-4 h-4" />
                  Report post
                </button>
              </>
            )}
            <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowShareMenu(true);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3"
            >
              <Share2 className="w-4 h-4" />
              Share post
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyPostLink();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3"
            >
              <Link2 className="w-4 h-4" />
              Copy link
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyEmbedCode();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3"
            >
              <Code className="w-4 h-4" />
              Embed post
            </button>
          </div>
        </>
      )}

      {/* Share Menu */}
      {showShareMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold">Share Post</h3>
            </div>
            <div className="p-4 space-y-2">
              {typeof navigator.share === 'function' && (
                <button
                  onClick={shareViaWebShare}
                  className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-3 transition-colors"
                >
                  <Share2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  <span>Share via...</span>
                </button>
              )}
              <button
                onClick={shareToTwitter}
                className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Twitter className="w-5 h-5 text-blue-400" />
                <span>Share on Twitter</span>
              </button>
              <button
                onClick={shareToLinkedIn}
                className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Linkedin className="w-5 h-5 text-blue-600" />
                <span>Share on LinkedIn</span>
              </button>
              <button
                onClick={() => {
                  copyPostLink();
                  setShowShareMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Link2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                <span>Copy link</span>
              </button>
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setShowShareMenu(false)}
                className="w-full px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold">Report Post</h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Why are you reporting this post?
              </p>
              <div className="space-y-2">
                {[
                  { value: "spam", label: "It's spam" },
                  { value: "harassment", label: "Harassment or bullying" },
                  { value: "inappropriate", label: "Inappropriate content" },
                  { value: "misinformation", label: "False information" },
                  { value: "other", label: "Other" },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="report"
                      value={option.value}
                      checked={reportReason === option.value}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-2 justify-end">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


