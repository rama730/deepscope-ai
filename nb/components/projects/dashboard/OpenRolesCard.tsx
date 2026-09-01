"use client";

import { Briefcase, UserPlus, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import DashboardCard from "./DashboardCard";

interface OpenRole {
  id: string;
  role: string;
  count: number;
  description?: string;
  skills?: string[];
  filled?: number;
}

// Update prop type to accept roleId
interface OpenRolesCardProps {
  roles: OpenRole[];
  hasPendingApplication: boolean;
  isCollaborator: boolean;
  onApply?: (roleId?: string) => void;
  onManageRoles?: () => void;
  isCreator: boolean;
}

export default function OpenRolesCard({
  roles,
  hasPendingApplication,
  isCollaborator,
  onApply,
  onManageRoles,
  isCreator,
}: OpenRolesCardProps) {
  // Calculate total open positions
  const totalOpenPositions = roles.reduce((sum, role) => {
    const remaining = (role.count || 0) - (role.filled || 0);
    return sum + Math.max(0, remaining);
  }, 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  };

  // Filter roles that still have open positions
  const openRoles = roles.filter((role) => {
    const remaining = (role.count || 0) - (role.filled || 0);
    return remaining > 0;
  });

  return (
    <DashboardCard
      title="Open Roles"
      icon={Briefcase}
      iconColor="text-orange-500 dark:text-orange-400"
      badge={totalOpenPositions > 0 ? { count: totalOpenPositions, variant: "warning" } : undefined}
      action={isCreator && onManageRoles ? { label: "Manage", onClick: onManageRoles } : undefined}
      compact
    >
      <div className="space-y-3">
        {/* Status Banner */}
        {isCollaborator ? (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Team member
            </span>
          </motion.div>
        ) : hasPendingApplication ? (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50"
          >
            <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Pending review
            </span>
          </motion.div>
        ) : null}

        {/* Roles List */}
        {openRoles.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-1.5"
          >
            {openRoles.map((role) => {
              const remaining = (role.count || 0) - (role.filled || 0);
              return (
                <motion.div
                  key={role.id}
                  variants={itemVariants}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50 group border border-slate-100 dark:border-zinc-700/50 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors"
                >
                  {/* Header: Role + Count + Apply */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
                        {role.role}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 flex-shrink-0">
                        {remaining}
                      </span>

                      {/* Specific Apply Button */}
                      {!isCreator && !isCollaborator && !hasPendingApplication && onApply && (
                        <button
                          onClick={() => onApply(role.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2.5 py-1 rounded-md font-medium"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {role.description && (
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mb-2 line-clamp-2">
                      {role.description}
                    </p>
                  )}

                  {/* Skills */}
                  {role.skills && role.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {role.skills.slice(0, 4).map((skill, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                          {skill}
                        </span>
                      ))}
                      {role.skills.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 dark:text-zinc-500">
                          +{role.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-3">
            <Briefcase className="w-6 h-6 text-slate-300 dark:text-zinc-600 mx-auto mb-1" />
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              No open positions
            </p>
          </div>
        )}

        {/* Generic Apply Button (Hidden for Creator & Collaborator) */}
        {!isCreator && !isCollaborator && !hasPendingApplication && totalOpenPositions > 0 && onApply && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => onApply()}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Apply General
            </button>
          </motion.div>
        )}
      </div>
    </DashboardCard>
  );
}

