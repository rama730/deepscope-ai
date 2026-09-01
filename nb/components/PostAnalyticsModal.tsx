"use client";

import { X, Eye, Heart, MessageCircle, Repeat, Bookmark } from "lucide-react";
import { Post } from "@/components/explorer/types";

interface PostAnalyticsModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

export default function PostAnalyticsModal({ post, isOpen, onClose }: PostAnalyticsModalProps) {
  if (!isOpen) return null;

  const stats = [
    { label: "Views", value: post.views_count || 0, icon: Eye, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Likes", value: post.likes_count || 0, icon: Heart, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
    { label: "Comments", value: post.comments_count || 0, icon: MessageCircle, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "Reposts", value: post.reposts_count || 0, icon: Repeat, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Bookmarks", value: post.saved_count || 0, icon: Bookmark, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
  ];

  // Calculate engagement rate (likes + comments + reposts) / views * 100
  const engagement = (post.likes_count + post.comments_count + post.reposts_count);
  const rate = post.views_count > 0 ? ((engagement / post.views_count) * 100).toFixed(1) : "0.0";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">Post Analytics</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 mb-2">Post Content</p>
            <p className="text-zinc-800 dark:text-zinc-200 line-clamp-2 font-medium">
              {post.content}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {stats.map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex items-center gap-4">
                <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium opacity-90">Engagement Rate</span>
              <span className="text-2xl font-bold">{rate}%</span>
            </div>
            <div className="w-full bg-white dark:bg-zinc-900/20 rounded-full h-1.5 mt-2">
              <div
                className="bg-white dark:bg-zinc-900 rounded-full h-1.5 transition-all duration-1000"
                style={{ width: `${Math.min(100, Number(rate) * 5)}%` }} // Scale up for visibility
              ></div>
            </div>
            <p className="text-xs mt-2 opacity-75">
              {engagement} total engagements from {post.views_count.toLocaleString()} views
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
