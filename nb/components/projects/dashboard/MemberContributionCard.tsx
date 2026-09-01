"use client";

import { CheckCircle2, MessageCircle, FileUp, TrendingUp } from "lucide-react";
import DashboardCard from "./DashboardCard";
import AvatarWithFallback from "@/components/ui-custom/AvatarWithFallback";
import Link from "next/link";
import { profileHref } from "@/lib/routing/identifiers";

interface MemberContributionCardProps {
  members: Array<{
    user_id: string;
    role?: string;
    profiles?: {
      full_name?: string;
      username?: string;
      avatar_url?: string;
    };
  }>;
  tasks: Array<{
    assigned_to?: string;
    created_by?: string;
    status?: string;
  }>;
  chatMessages: Array<{ user_id?: string }>;
  files: Array<{ uploaded_by?: string }>;
}

export default function MemberContributionCard({
  members,
  tasks,
  chatMessages,
  files,
}: MemberContributionCardProps) {
  const memberStats = members.map(member => {
    const userId = member.user_id;
    const tasksCompleted = tasks.filter(t => t.assigned_to === userId && t.status === "done").length;
    const tasksCreated = tasks.filter(t => t.created_by === userId).length;
    const messagesCount = chatMessages.filter(m => m.user_id === userId).length;
    const filesUploaded = files.filter(f => f.uploaded_by === userId).length;
    const totalContributions = tasksCompleted + tasksCreated + messagesCount + filesUploaded;

    return {
      ...member,
      tasksCompleted,
      tasksCreated,
      messagesCount,
      filesUploaded,
      totalContributions,
    };
  }).sort((a, b) => b.totalContributions - a.totalContributions).slice(0, 5);

  if (memberStats.length === 0) return null;

  return (
    <DashboardCard
      title="Top Contributors"
      icon={TrendingUp}
      iconColor="text-purple-500 dark:text-purple-400"
      compact
    >
      <div className="space-y-3">
        {memberStats.map((member, index) => (
          <Link
            key={member.user_id}
            href={profileHref({ id: member.user_id, username: member.profiles?.username })}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors group"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative">
                <AvatarWithFallback
                  src={member.profiles?.avatar_url}
                  alt={member.profiles?.full_name || member.profiles?.username || "Member"}
                  fallback={member.profiles?.full_name?.[0] || member.profiles?.username?.[0] || "M"}
                  size="sm"
                />
                {index === 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                    1
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {member.profiles?.full_name || member.profiles?.username || "Member"}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                  {member.role || "Team Member"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-zinc-400">
              {member.tasksCompleted > 0 && (
                <div className="flex items-center gap-1" title={`${member.tasksCompleted} tasks completed`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{member.tasksCompleted}</span>
                </div>
              )}
              {member.messagesCount > 0 && (
                <div className="flex items-center gap-1" title={`${member.messagesCount} messages`}>
                  <MessageCircle className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{member.messagesCount}</span>
                </div>
              )}
              {member.filesUploaded > 0 && (
                <div className="flex items-center gap-1" title={`${member.filesUploaded} files`}>
                  <FileUp className="w-3.5 h-3.5 text-purple-500" />
                  <span>{member.filesUploaded}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}

