"use client";

import { useEffect, useState, memo } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface RadialProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg" | "xl";
  strokeWidth?: number;
  showValue?: boolean;
  label?: string;
  color?: "indigo" | "emerald" | "amber" | "rose" | "purple" | "cyan";
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { dimension: 48, fontSize: "text-xs", labelSize: "text-[10px]" },
  md: { dimension: 72, fontSize: "text-sm", labelSize: "text-xs" },
  lg: { dimension: 96, fontSize: "text-lg", labelSize: "text-sm" },
  xl: { dimension: 128, fontSize: "text-2xl", labelSize: "text-base" },
};

const colorConfig = {
  indigo: {
    stroke: "stroke-indigo-500",
    glow: "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]",
    text: "text-indigo-600 dark:text-indigo-400",
    gradient: ["#6366f1", "#8b5cf6"],
  },
  emerald: {
    stroke: "stroke-emerald-500",
    glow: "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    text: "text-emerald-600 dark:text-emerald-400",
    gradient: ["#10b981", "#34d399"],
  },
  amber: {
    stroke: "stroke-amber-500",
    glow: "drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]",
    text: "text-amber-600 dark:text-amber-400",
    gradient: ["#f59e0b", "#fbbf24"],
  },
  rose: {
    stroke: "stroke-rose-500",
    glow: "drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]",
    text: "text-rose-600 dark:text-rose-400",
    gradient: ["#f43f5e", "#fb7185"],
  },
  purple: {
    stroke: "stroke-purple-500",
    glow: "drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]",
    text: "text-purple-600 dark:text-purple-400",
    gradient: ["#a855f7", "#c084fc"],
  },
  cyan: {
    stroke: "stroke-cyan-500",
    glow: "drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]",
    text: "text-cyan-600 dark:text-cyan-400",
    gradient: ["#06b6d4", "#22d3ee"],
  },
};

function RadialProgress({
  value,
  max = 100,
  size = "md",
  strokeWidth = 6,
  showValue = true,
  label,
  color = "indigo",
  animated = true,
  className = "",
}: RadialProgressProps) {
  const [mounted, setMounted] = useState(false);
  const { dimension, fontSize, labelSize } = sizeConfig[size];
  const colors = colorConfig[color];
  
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const displayValue = useTransform(spring, (v) => Math.round(v));
  
  useEffect(() => {
    setMounted(true);
    if (animated) {
      spring.set(value);
    }
  }, [value, animated, spring]);

  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        className={`transform -rotate-90 ${colors.glow}`}
      >
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-zinc-200 dark:text-zinc-700/50"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="100%" stopColor={colors.gradient[1]} />
          </linearGradient>
        </defs>
        
        {/* Progress circle */}
        <motion.circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke={`url(#gradient-${color})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: mounted ? strokeDashoffset : circumference }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      
      {/* Center content */}
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span className={`font-bold ${fontSize} ${colors.text}`}>
            {animated ? (
              <motion.span>{displayValue}</motion.span>
            ) : (
              value
            )}
            <span className="text-[0.6em] opacity-70">%</span>
          </motion.span>
          {label && (
            <span className={`${labelSize} text-zinc-500 dark:text-zinc-400 font-medium`}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(RadialProgress);

