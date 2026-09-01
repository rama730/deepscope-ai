"use client";

import { memo } from "react";
import { TrendingUp, TrendingDown, Activity, Clock, CheckCircle2 } from "lucide-react";
import DashboardCard from "./DashboardCard";

interface ProjectInsightsCardProps {
  tasksCompleted: number;
  tasksTotal: number;
  completionRate: number;
  recentActivityCount: number;
  daysActive: number;
  tasksTrend: "up" | "down" | "stable";
  activityTrend: "up" | "down" | "stable";
}

function ProjectInsightsCard({
  tasksCompleted,
  tasksTotal,
  completionRate,
  recentActivityCount,
  daysActive,
  tasksTrend,
  // activityTrend, // Unused
}: ProjectInsightsCardProps) {
  const healthScore = Math.round(
    (completionRate * 0.4) +
    (Math.min(recentActivityCount / 10, 1) * 30) +
    (Math.min(daysActive / 30, 1) * 30)
  );

  const getHealthColor = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getHealthLabel = (score: number) => {
    if (score >= 70) return "Healthy";
    if (score >= 50) return "Moderate";
    return "Needs Attention";
  };

  return (
    <DashboardCard
      title="Project Insights"
      icon={Activity}
      iconColor="text-blue-500 dark:text-blue-400"
      compact
    >
      <div className="space-y-4">
        {/* Health Score */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-800 dark:to-zinc-900 border border-slate-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wide">
              Project Health
            </span>
            <span className={`text-xs font-semibold ${getHealthColor(healthScore)}`}>
              {getHealthLabel(healthScore)}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>
              {healthScore}
            </span>
            <span className="text-sm text-slate-500 dark:text-zinc-500">/ 100</span>
          </div>
          <div className="mt-2 h-2 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${healthScore >= 70 ? "bg-emerald-500" : healthScore >= 50 ? "bg-amber-500" : "bg-red-500"
                }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                Completion
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">
              {completionRate}%
            </div>
            {tasksTrend !== "stable" && (
              <div className={`flex items-center gap-1 text-xs mt-0.5 ${tasksTrend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}>
                {tasksTrend === "up" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>Trending {tasksTrend === "up" ? "up" : "down"}</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                Activity
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">
              {recentActivityCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
              Last 7 days
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                Active Days
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">
              {daysActive}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                Tasks Done
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">
              {tasksCompleted}/{tasksTotal}
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export default memo(ProjectInsightsCard);

