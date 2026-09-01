"use client";

import React, { memo } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Trash2,
  Edit2,
  MessageSquareOff,
  Link as LinkIcon,
  Bookmark,
  EyeOff,
  VolumeX,
  Ban,
  Flag,
  Rocket,
  Code2,
  Handshake
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTimeAgo, formatFullDate } from "@/lib/utils/date";
import { useProfilePrefetch } from "@/hooks/useProfilePrefetch";
import { toast } from "sonner"; // Assuming sonner is used, or fallback to console/alert
import { Post } from "@/components/explorer/types";

interface PostHeaderProps {
  post: Post;
  postId: string;
  userId: string;
  username: string;
  fullName: string;
  createdAt: string;
  currentUser: any;
  onDelete?: (postId: string) => void;
  onProfileClick?: (e: React.MouseEvent) => void;
}

export const PostHeader = memo(function PostHeader({
  post,
  postId,
  userId,
  username,
  fullName,
  createdAt,
  currentUser,
  onDelete,
  onProfileClick,
}: PostHeaderProps) {
  const { prefetchProfile } = useProfilePrefetch();
  const isAuthor = currentUser && currentUser.id === userId;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleNotImplemented = (action: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(`${action} coming soon`);
  };

  const hasCode = post.tokens?.some(t => t.type === 'code');
  const hasProject = !!post.project;
  const hasCollab = !!post.project?.project_open_roles && post.project.project_open_roles.length > 0;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${username}`}
            onClick={onProfileClick}
            onMouseEnter={() => userId && prefetchProfile(userId)}
            className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline decoration-zinc-400 underline-offset-4 text-[15px]"
          >
            {fullName || username || "User"}
          </Link>
          <span className="text-zinc-400 dark:text-zinc-500 text-sm">
            @{username}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700 text-xs">·</span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  suppressHydrationWarning
                  className="text-zinc-400 dark:text-zinc-500 text-sm hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {formatTimeAgo(createdAt)}
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white dark:bg-zinc-800 border-none text-xs px-2 py-1">
                {formatFullDate(createdAt)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="relative -mt-1 -mr-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 text-zinc-700 dark:text-zinc-200">

            {/* --- Author Actions --- */}
            {isAuthor && (
              <>
                <DropdownMenuItem onClick={handleNotImplemented("Edit Post")} className="gap-2 cursor-pointer">
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Post</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleNotImplemented("Disable Comments")} className="gap-2 cursor-pointer">
                  <MessageSquareOff className="w-4 h-4" />
                  <span>Disable Comments</span>
                </DropdownMenuItem>

                {post.project && (
                  <DropdownMenuItem className="gap-2 cursor-pointer text-blue-600 dark:text-blue-400 focus:text-blue-700 dark:focus:text-blue-300">
                    <Rocket className="w-4 h-4" />
                    <span>Update Status</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
                  <LinkIcon className="w-4 h-4" />
                  <span>Copy Link</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) onDelete(postId);
                  }}
                  className="gap-2 cursor-pointer text-red-600 dark:text-red-500 focus:text-red-700 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Post</span>
                </DropdownMenuItem>
              </>
            )}

            {/* --- Viewer Actions --- */}
            {!isAuthor && (
              <>
                <DropdownMenuItem onClick={handleNotImplemented("Save")} className="gap-2 cursor-pointer">
                  <Bookmark className="w-4 h-4" />
                  <span>Save Post</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
                  <LinkIcon className="w-4 h-4" />
                  <span>Copy Link</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {hasProject && (
                  <DropdownMenuItem onClick={() => window.location.href = `/project/${post.project!.slug}`} className="gap-2 cursor-pointer text-indigo-600 dark:text-indigo-400">
                    <Rocket className="w-4 h-4" />
                    <span>View Project</span>
                  </DropdownMenuItem>
                )}

                {hasCollab && (
                  <DropdownMenuItem onClick={handleNotImplemented("Collaboration")} className="gap-2 cursor-pointer text-indigo-600 dark:text-indigo-400">
                    <Handshake className="w-4 h-4" />
                    <span>I'm Interested</span>
                  </DropdownMenuItem>
                )}

                {hasCode && (
                  <DropdownMenuItem onClick={handleNotImplemented("Copy Code")} className="gap-2 cursor-pointer">
                    <Code2 className="w-4 h-4" />
                    <span>Copy Snippet</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleNotImplemented("Not Interested")} className="gap-2 cursor-pointer">
                  <EyeOff className="w-4 h-4" />
                  <span>Not Interested</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleNotImplemented("Mute User")} className="gap-2 cursor-pointer">
                  <VolumeX className="w-4 h-4" />
                  <span>Mute @{username}</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleNotImplemented("Block User")} className="gap-2 cursor-pointer">
                  <Ban className="w-4 h-4" />
                  <span>Block @{username}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleNotImplemented("Report")} className="gap-2 cursor-pointer text-red-600 dark:text-red-500 focus:text-red-700 dark:focus:text-red-400">
                  <Flag className="w-4 h-4" />
                  <span>Report Post</span>
                </DropdownMenuItem>
              </>
            )}

          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
