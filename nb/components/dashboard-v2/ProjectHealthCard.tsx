"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Target,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import RadialProgress from "./RadialProgress";

interface ProjectHealthCardProps {
  projectName: string;
  healthScore: number;
  metrics: {
    tasksCompleted: number;
    tasksTotal: number;
    overdueItems: number;
    stalledTasks: number;
    activeMembers: number;
    totalMembers: number;
    velocityChange: number;
    upcomingDeadlines: number;
  };
  milestones?: Array<{
    name: string;
    dueDate: string;
    progress: number;
  }>;
  onViewDetails?: () => void;
  className?: string;
}

function getHealthStatus(score: number): {
  label: string;
  color: string;
  bgColor: string;
  description: string;
} {
  if (score >= 80) {
    return {
      label: "Excellent",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      description: "Project is on track and performing well",
    };
  }
  if (score >= 60) {
    return {
      label: "Good",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      description: "Minor issues but overall healthy",
    };
  }
  if (score >= 40) {
    return {
      label: "Needs Attention",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      description: "Some blockers need to be addressed",
    };
  }
  return {
    label: "At Risk",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    description: "Critical issues require immediate attention",
  };
}

function ProjectHealthCard({
  projectName,
  healthScore,
  metrics,
  milestones = [],
  onViewDetails,
  className,
}: ProjectHealthCardProps) {
  const status = useMemo(() => getHealthStatus(healthScore), [healthScore]);
  const completionRate = useMemo(
    () => (metrics.tasksTotal > 0 ? Math.round((metrics.tasksCompleted / metrics.tasksTotal) * 100) : 0),
    [metrics.tasksCompleted, metrics.tasksTotal]
  );

  const riskIndicators = useMemo(() => {
    const risks: Array<{ label: string; severity: "high" | "medium" | "low"; icon: React.ElementType }> = [];

    if (metrics.overdueItems > 0) {
      risks.push({
        label: `${metrics.overdueItems} overdue item${metrics.overdueItems > 1 ? "s" : ""}`,
        severity: metrics.overdueItems > 3 ? "high" : "medium",
        icon: AlertTriangle,
      });
    }
    if (metrics.stalledTasks > 0) {
      risks.push({
        label: `${metrics.stalledTasks} stalled task${metrics.stalledTasks > 1 ? "s" : ""}`,
        severity: metrics.stalledTasks > 2 ? "high" : "medium",
        icon: Clock,
      });
    }
    if (metrics.activeMembers < metrics.totalMembers * 0.5) {
      risks.push({
        label: "Low team activity",
        severity: "medium",
        icon: Users,
      });
    }
    if (metrics.velocityChange < -20) {
      risks.push({
        label: "Velocity declining",
        severity: "medium",
        icon: TrendingDown,
      });
    }

    return risks;
  }, [metrics]);

  const severityColors = {
    high: "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30",
    medium: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
    low: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rounded-2xl overflow-hidden",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200 dark:border-zinc-800",
        "shadow-sm hover:shadow-lg transition-shadow",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{projectName}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Project Health</p>
            </div>
          </div>
          <div className={cn("px-2 py-1 rounded-full text-xs font-medium", status.bgColor, status.color)}>
            {status.label}
          </div>
        </div>

        {/* Health score gauge */}
        <div className="flex items-center gap-4">
          <RadialProgress
            value={healthScore}
            size="lg"
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
          <div className="flex-1">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">{status.description}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {completionRate}% complete
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {metrics.activeMembers}/{metrics.totalMembers} active
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {metrics.velocityChange >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {metrics.velocityChange >= 0 ? "+" : ""}
                  {metrics.velocityChange}% velocity
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {metrics.upcomingDeadlines} deadline{metrics.upcomingDeadlines !== 1 ? "s" : ""} soon
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk indicators */}
      {riskIndicators.length > 0 && (
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50">
          <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Risk Indicators
          </p>
          <div className="flex flex-wrap gap-1.5">
            {riskIndicators.map((risk, index) => {
              const Icon = risk.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
                    severityColors[risk.severity]
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {risk.label}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Upcoming Milestones
          </p>
          <div className="space-y-2">
            {milestones.slice(0, 3).map((milestone, index) => {
              const dueDate = new Date(milestone.dueDate);
              const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysUntil < 0;
              const isDueSoon = daysUntil <= 3 && daysUntil >= 0;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-2.5"
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
                      milestone.progress >= 100
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : isOverdue
                          ? "bg-rose-100 dark:bg-rose-900/30"
                          : isDueSoon
                            ? "bg-amber-100 dark:bg-amber-900/30"
                            : "bg-zinc-100 dark:bg-zinc-800"
                    )}
                  >
                    {milestone.progress >= 100 ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : isOverdue ? (
                      <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    ) : isDueSoon ? (
                      <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Target className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {milestone.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            milestone.progress >= 100
                              ? "bg-emerald-500"
                              : milestone.progress >= 50
                                ? "bg-blue-500"
                                : "bg-amber-500"
                          )}
                          style={{ width: `${Math.min(milestone.progress, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                        {milestone.progress}%
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium flex-shrink-0",
                      isOverdue
                        ? "text-rose-600 dark:text-rose-400"
                        : isDueSoon
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    {isOverdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? "Today" : `${daysUntil}d left`}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* View details button */}
      {onViewDetails && (
        <div className="px-4 pb-4">
          <motion.button
            onClick={onViewDetails}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
          >
            View Full Health Report
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

export default memo(ProjectHealthCard);

