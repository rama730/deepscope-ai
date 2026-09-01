"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import Sparkline from "./Sparkline";

interface VelocityChartProps {
  data: number[];
  labels?: string[];
  currentVelocity: number;
  averageVelocity: number;
  targetVelocity?: number;
  period?: "daily" | "weekly" | "monthly";
  className?: string;
}

function VelocityChart({
  data,
  labels,
  currentVelocity,
  averageVelocity,
  targetVelocity,
  period = "weekly",
  className,
}: VelocityChartProps) {
  const trend = useMemo(() => {
    if (data.length < 2) return { direction: "neutral" as const, percentage: 0 };
    
    const recent = data.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previous = data.slice(-6, -3).reduce((a, b) => a + b, 0) / 3 || recent;
    const change = previous !== 0 ? ((recent - previous) / previous) * 100 : 0;
    
    return {
      direction: change > 5 ? ("up" as const) : change < -5 ? ("down" as const) : ("neutral" as const),
      percentage: Math.abs(Math.round(change)),
    };
  }, [data]);

  const targetProgress = useMemo(() => {
    if (!targetVelocity || targetVelocity === 0) return null;
    return Math.round((currentVelocity / targetVelocity) * 100);
  }, [currentVelocity, targetVelocity]);

  const periodLabels = {
    daily: "Today",
    weekly: "This Week",
    monthly: "This Month",
  };

  const TrendIcon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const trendColor =
    trend.direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend.direction === "down"
      ? "text-rose-600 dark:text-rose-400"
      : "text-zinc-500 dark:text-zinc-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl p-5",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200 dark:border-zinc-800",
        "shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Velocity
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {periodLabels[period]}
            </p>
          </div>
        </div>
        
        <div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium", trendColor)}>
          <TrendIcon className="w-4 h-4" />
          <span>{trend.percentage}%</span>
        </div>
      </div>

      {/* Main velocity display */}
      <div className="flex items-end gap-6 mb-4">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold text-zinc-900 dark:text-zinc-100"
          >
            {currentVelocity}
          </motion.p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">tasks completed</p>
        </div>
        
        <div className="flex-1">
          <Sparkline
            data={data}
            color={trend.direction === "up" ? "emerald" : trend.direction === "down" ? "rose" : "indigo"}
            width={180}
            height={48}
            showArea
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Average</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {averageVelocity}
            <span className="text-sm font-normal text-zinc-500 ml-1">/ {period}</span>
          </p>
        </div>
        
        {targetVelocity && targetProgress !== null && (
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" />
              Target Progress
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(targetProgress, 100)}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className={cn(
                    "h-full rounded-full",
                    targetProgress >= 100
                      ? "bg-emerald-500"
                      : targetProgress >= 70
                      ? "bg-blue-500"
                      : targetProgress >= 40
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  )}
                />
              </div>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {targetProgress}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Weekly breakdown (if we have labels) */}
      {labels && labels.length > 0 && data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-end justify-between gap-1">
            {data.slice(-7).map((value, index) => {
              const maxValue = Math.max(...data.slice(-7));
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
              const isToday = index === data.slice(-7).length - 1;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, 4)}%` }}
                    transition={{ delay: 0.3 + index * 0.05, duration: 0.4 }}
                    className={cn(
                      "w-full rounded-t-sm min-h-[4px] max-h-12",
                      isToday
                        ? "bg-indigo-500"
                        : "bg-zinc-200 dark:bg-zinc-700"
                    )}
                    style={{ height: `${Math.max(height * 0.48, 4)}px` }}
                  />
                  <span className={cn(
                    "text-[10px]",
                    isToday
                      ? "text-indigo-600 dark:text-indigo-400 font-medium"
                      : "text-zinc-400 dark:text-zinc-500"
                  )}>
                    {labels[index] || ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default memo(VelocityChart);

