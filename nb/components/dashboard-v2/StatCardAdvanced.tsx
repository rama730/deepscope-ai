"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import AnimatedCounter from "./AnimatedCounter";
import Sparkline from "./Sparkline";
import RadialProgress from "./RadialProgress";

type TrendDirection = "up" | "down" | "neutral";
type CardVariant = "default" | "compact" | "featured";
type DisplayMode = "number" | "percentage" | "radial" | "sparkline";

interface StatCardAdvancedProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    direction: TrendDirection;
    label?: string;
  };
  sparklineData?: number[];
  color?: "indigo" | "emerald" | "amber" | "rose" | "purple" | "cyan";
  variant?: CardVariant;
  displayMode?: DisplayMode;
  maxValue?: number;
  onClick?: () => void;
  className?: string;
}

const colorConfig = {
  indigo: {
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    accentBorder: "border-l-indigo-500",
    gradient: "from-indigo-500/10 via-transparent to-transparent",
  },
  emerald: {
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accentBorder: "border-l-emerald-500",
    gradient: "from-emerald-500/10 via-transparent to-transparent",
  },
  amber: {
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    accentBorder: "border-l-amber-500",
    gradient: "from-amber-500/10 via-transparent to-transparent",
  },
  rose: {
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600 dark:text-rose-400",
    accentBorder: "border-l-rose-500",
    gradient: "from-rose-500/10 via-transparent to-transparent",
  },
  purple: {
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
    accentBorder: "border-l-purple-500",
    gradient: "from-purple-500/10 via-transparent to-transparent",
  },
  cyan: {
    iconBg: "bg-cyan-100 dark:bg-cyan-900/30",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    accentBorder: "border-l-cyan-500",
    gradient: "from-cyan-500/10 via-transparent to-transparent",
  },
};

const trendConfig: Record<TrendDirection, { icon: LucideIcon; color: string }> = {
  up: {
    icon: TrendingUp,
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
  },
  down: {
    icon: TrendingDown,
    color: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30",
  },
  neutral: {
    icon: Minus,
    color: "text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800",
  },
};

function StatCardAdvanced({
  title,
  value,
  icon: Icon,
  description,
  trend,
  sparklineData,
  color = "indigo",
  variant = "default",
  displayMode = "number",
  maxValue = 100,
  onClick,
  className,
}: StatCardAdvancedProps) {
  const colors = colorConfig[color];
  const isInteractive = !!onClick;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={isInteractive ? { scale: 1.02, y: -2 } : undefined}
      onClick={onClick}
      className={cn(
        "relative group rounded-2xl overflow-hidden",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200 dark:border-zinc-800",
        "shadow-sm hover:shadow-lg",
        "transition-all duration-300",
        isInteractive && "cursor-pointer",
        variant === "featured" && `border-l-4 ${colors.accentBorder}`,
        className
      )}
    >
      {/* Gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          colors.gradient
        )}
      />

      <div className={cn(
        "relative z-10",
        variant === "compact" ? "p-4" : "p-5"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "rounded-xl flex items-center justify-center",
            colors.iconBg,
            variant === "compact" ? "w-10 h-10" : "w-12 h-12"
          )}>
            <Icon className={cn(
              colors.iconColor,
              variant === "compact" ? "w-5 h-5" : "w-6 h-6"
            )} />
          </div>

          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
                trendConfig[trend.direction].color
              )}
            >
              {(() => {
                const TrendIcon = trendConfig[trend.direction].icon;
                return <TrendIcon className="w-3.5 h-3.5" />;
              })()}
              <span>
                {trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}
                {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          {title}
        </p>

        {/* Value display based on mode */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            {displayMode === "radial" ? (
              <div className="flex items-center gap-4">
                <RadialProgress
                  value={value}
                  max={maxValue}
                  size="md"
                  color={color}
                  label={description}
                />
              </div>
            ) : (
              <>
                <div className={cn(
                  "font-bold text-zinc-900 dark:text-zinc-100",
                  variant === "compact" ? "text-2xl" : "text-3xl"
                )}>
                  <AnimatedCounter
                    value={value}
                    suffix={displayMode === "percentage" ? "%" : ""}
                  />
                </div>
                {description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {description}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 0 && displayMode !== "radial" && (
            <div className="flex-shrink-0">
              <Sparkline
                data={sparklineData}
                color={color}
                width={80}
                height={32}
                showTrend={!trend}
              />
            </div>
          )}
        </div>

        {/* Trend label */}
        {trend?.label && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            {trend.label}
          </p>
        )}
      </div>

      {/* Interactive indicator */}
      {isInteractive && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="absolute right-4 top-1/2 -translate-y-1/2"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(StatCardAdvanced);

