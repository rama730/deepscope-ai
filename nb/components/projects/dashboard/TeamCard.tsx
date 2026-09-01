"use client";

import Link from "next/link";
import { Users, UserPlus, Crown, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import DashboardCard from "./DashboardCard";
import AvatarWithFallback from "@/components/ui-custom/AvatarWithFallback";
import { profileHref } from "@/lib/routing/identifiers";

interface TeamMember {
  user_id: string;
  role?: string;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface OpenRole {
  id: string;
  role: string;
  count: number;
  filled: number;
}

interface TeamCardProps {
  project: any;
  members: TeamMember[];
  openRoles?: OpenRole[];
  isCreator: boolean;
  onManageTeam?: () => void;
  onInvite?: () => void;
}

export default function TeamCard({
  project,
  members,
  openRoles = [],
  isCreator,
  onManageTeam,
  onInvite,
}: TeamCardProps) {
  const totalMembers = members.length + 1; // +1 for creator
  const unfilledRoles = openRoles.reduce((acc, r) => acc + (r.count - (r.filled || 0)), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  return (
    <DashboardCard
      title="The Team"
      icon={Users}
      iconColor="text-purple-500 dark:text-purple-400"
      badge={{ count: totalMembers + unfilledRoles, variant: "default" }}
      action={
        isCreator && onManageTeam
          ? { label: "Manage", onClick: onManageTeam }
          : undefined
      }
      compact
      className="flex flex-col h-fit"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-2 overflow-y-auto pr-1 max-h-[600px]"
      >
        <div className="grid grid-cols-1 gap-1.5">
          {/* Creator / Owner */}
          {project?.profiles && (
            <Link
              href={profileHref({ id: project.creator_id, username: project.profiles?.username })}
              className="flex items-center gap-2.5 p-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800/50 hover:border-amber-200 dark:hover:border-amber-700 transition-colors group relative overflow-hidden"
            >
              <div className="relative">
                <AvatarWithFallback
                  src={project.profiles.avatar_url}
                  alt={project.profiles.full_name || project.profiles.username || "Creator"}
                  fallback={project.profiles.full_name?.[0] || project.profiles.username?.[0] || "C"}
                  size="sm"
                  className="w-7 h-7"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center shadow-sm border-2 border-white dark:border-zinc-900">
                  <Crown className="w-2 h-2 text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                  {project.profiles.full_name || project.profiles.username || "Creator"}
                </p>
                <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wide">
                  Project Lead
                </p>
              </div>
            </Link>
          )}

          {/* Collaborators */}
          {members.map((member) => (
            <Link
              key={member.user_id}
              href={profileHref({ id: member.user_id, username: member.profiles?.username })}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-zinc-800"
            >
              <AvatarWithFallback
                src={member.profiles?.avatar_url}
                alt={member.profiles?.full_name || member.profiles?.username || "Member"}
                fallback={member.profiles?.full_name?.[0] || member.profiles?.username?.[0] || "M"}
                size="sm"
                className="w-7 h-7"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {member.profiles?.full_name || member.profiles?.username || "Member"}
                </p>
                <p className="text-[9px] text-slate-500 dark:text-zinc-400 truncate uppercase tracking-wide">
                  {member.role || "Team Member"}
                </p>
              </div>
            </Link>
          ))}

          {/* Ghost Slots for Open Roles - Compact */}
          {openRoles.map((role) => {
            const availableSpots = Math.max(0, role.count - role.filled);
            return Array.from({ length: availableSpots }).map((_, idx) => (
              <div
                key={`${role.id}-${idx}`}
                className="flex items-center gap-2.5 p-1.5 rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30 opacity-70 hover:opacity-100 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group"
                onClick={onManageTeam}
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                  <PlusCircle className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Hiring...
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wide">
                    {role.role}
                  </p>
                </div>
              </div>
            ));
          })}
        </div>

        {/* Invite Button (if creator) */}
        {isCreator && onInvite && (
          <div className="pt-1.5">
            <button
              onClick={onInvite}
              className="w-full flex items-center justify-center gap-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors text-[10px] font-medium"
            >
              <UserPlus className="w-3 h-3" />
              Invite
            </button>
          </div>
        )}
      </motion.div>
    </DashboardCard>
  );
}
