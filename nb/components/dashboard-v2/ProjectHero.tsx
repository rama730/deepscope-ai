"use client";

import { memo, useMemo } from "react";
// Removed framer-motion import
import Link from "next/link";
import {
  ChevronLeft,
  Bookmark,
  Bell,
  Share2,
  Globe,
  Lock,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PresenceIndicator from "./PresenceIndicator";
import RadialProgress from "./RadialProgress";

interface ProjectHeroProps {
  project: {
    id: string;
    title: string;
    description?: string;
    status: string;
    visibility?: "public" | "private";
    created_at: string;
    profiles?: {
      full_name?: string;
      username?: string;
      avatar_url?: string;
    };
  };
  healthScore: number;
  isBookmarked?: boolean;
  isFollowing?: boolean;
  onlineMembers?: Array<{
    id: string;
    name: string;
    avatar?: string;
    status?: "online" | "away" | "busy" | "offline";
  }>;
  onBookmark?: () => void;
  onFollow?: () => void;
  onShare?: () => void;
  className?: string;
}

function ProjectHero({
  project,
  healthScore,
  isBookmarked = false,
  isFollowing = false,
  onlineMembers = [],
  onBookmark,
  onFollow,
  onShare,
  className,
}: ProjectHeroProps) {
  const statusConfig = useMemo(() => {
    switch (project.status) {
      case "active":
        return { label: "Active", color: "bg-emerald-500", pulse: true };
      case "completed":
        return { label: "Completed", color: "bg-blue-500", pulse: false };
      case "on_hold":
        return { label: "On Hold", color: "bg-amber-500", pulse: false };
      case "archived":
        return { label: "Archived", color: "bg-zinc-500", pulse: false };
      default:
        return { label: project.status, color: "bg-zinc-500", pulse: false };
    }
  }, [project.status]);

  const createdDate = useMemo(() => {
    return new Date(project.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [project.created_at]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500",
        "bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900",
        "dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950",
        className
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute -top-1/2 -right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-3xl animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute -bottom-1/2 -left-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/20 blur-3xl animate-pulse"
          style={{ animationDuration: "6s" }}
        />
      </div>

      <div className="relative z-10 p-6 sm:p-8">
        {/* Top row - Navigation and actions */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/hub"
            className="group flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Hub
          </Link>

          <div className="flex items-center gap-2">
            {/* Bookmark */}
            <button
              onClick={onBookmark}
              className={cn(
                "p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95",
                isBookmarked
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-white dark:bg-zinc-900/10 text-zinc-400 hover:bg-white dark:bg-zinc-900/20 hover:text-white"
              )}
            >
              <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
            </button>

            {/* Follow */}
            <button
              onClick={onFollow}
              className={cn(
                "p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95",
                isFollowing
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-white dark:bg-zinc-900/10 text-zinc-400 hover:bg-white dark:bg-zinc-900/20 hover:text-white"
              )}
            >
              <Bell className={cn("w-4 h-4", isFollowing && "fill-current")} />
            </button>

            {/* Share */}
            <button
              onClick={onShare}
              className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/10 text-zinc-400 hover:bg-white dark:bg-zinc-900/20 hover:text-white transition-all hover:scale-105 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left side - Project info */}
          <div className="flex-1">
            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-900/10 backdrop-blur-sm">
                <span className={cn("w-2 h-2 rounded-full", statusConfig.color)}>
                  {statusConfig.pulse && (
                    <span className={cn("absolute inset-0 rounded-full animate-ping", statusConfig.color, "opacity-75")} />
                  )}
                </span>
                <span className="text-xs font-medium text-white">{statusConfig.label}</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-900/10 backdrop-blur-sm">
                {project.visibility === "private" ? (
                  <Lock className="w-3 h-3 text-zinc-400" />
                ) : (
                  <Globe className="w-3 h-3 text-zinc-400" />
                )}
                <span className="text-xs font-medium text-zinc-300 capitalize">
                  {project.visibility || "Public"}
                </span>
              </div>
            </div>

            {/* Title */}
            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-3 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100"
            >
              {project.title}
            </h1>

            {/* Description */}
            {project.description && (
              <p
                className="text-zinc-400 max-w-2xl mb-4 line-clamp-2 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200"
              >
                {project.description}
              </p>
            )}

            {/* Meta info */}
            <div
              className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300"
            >
              {project.profiles && (
                <Link
                  href={`/profile/${project.profiles.username}`}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  {project.profiles.avatar_url ? (
                    <img
                      src={project.profiles.avatar_url}
                      alt={project.profiles.full_name || "Creator"}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                      {(project.profiles.full_name || project.profiles.username || "C").charAt(0)}
                    </div>
                  )}
                  <span>
                    {project.profiles.full_name || project.profiles.username}
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </Link>
              )}

              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Created {createdDate}</span>
              </div>
            </div>

            {/* Online members */}
            {onlineMembers.length > 0 && (
              <div
                className="mt-6 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500"
              >
                <PresenceIndicator
                  users={onlineMembers}
                  showNames
                  size="md"
                />
              </div>
            )}
          </div>

          {/* Right side - Health score */}
          <div
            className="flex flex-col items-center p-6 rounded-2xl bg-white dark:bg-zinc-900/5 backdrop-blur-sm border border-white/10 animate-in zoom-in-95 fade-in duration-700 delay-300"
          >
            <RadialProgress
              value={healthScore}
              size="xl"
              color={
                healthScore >= 80
                  ? "emerald"
                  : healthScore >= 60
                    ? "cyan"
                    : healthScore >= 40
                      ? "amber"
                      : "rose"
              }
              label="Health"
            />
            <p className="mt-3 text-sm text-zinc-400">Project Health Score</p>
            <p className="text-xs text-zinc-500 mt-1">
              {healthScore >= 80
                ? "Excellent"
                : healthScore >= 60
                  ? "Good"
                  : healthScore >= 40
                    ? "Needs Attention"
                    : "At Risk"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ProjectHero);

