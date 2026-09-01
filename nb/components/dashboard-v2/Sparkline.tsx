"use client";

import { memo, useMemo } from "react";
// Removed framer-motion

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: "indigo" | "emerald" | "amber" | "rose" | "purple" | "cyan";
  showArea?: boolean;
  showDots?: boolean;
  showTrend?: boolean;
  animated?: boolean;
  className?: string;
}

const colorConfig = {
  indigo: {
    stroke: "#6366f1",
    fill: "rgba(99, 102, 241, 0.15)",
    dot: "#4f46e5",
  },
  emerald: {
    stroke: "#10b981",
    fill: "rgba(16, 185, 129, 0.15)",
    dot: "#059669",
  },
  amber: {
    stroke: "#f59e0b",
    fill: "rgba(245, 158, 11, 0.15)",
    dot: "#d97706",
  },
  rose: {
    stroke: "#f43f5e",
    fill: "rgba(244, 63, 94, 0.15)",
    dot: "#e11d48",
  },
  purple: {
    stroke: "#a855f7",
    fill: "rgba(168, 85, 247, 0.15)",
    dot: "#9333ea",
  },
  cyan: {
    stroke: "#06b6d4",
    fill: "rgba(6, 182, 212, 0.15)",
    dot: "#0891b2",
  },
};

function Sparkline({
  data,
  width = 120,
  height = 32,
  color = "indigo",
  showArea = true,
  showDots = false,
  showTrend = false,
  animated = true,
  className = "",
}: SparklineProps) {
  const colors = colorConfig[color];

  const { path, areaPath, points, trend } = useMemo(() => {
    if (!data.length) return { path: "", areaPath: "", points: [], trend: 0 };

    const padding = 4;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const xStep = (width - padding * 2) / (data.length - 1 || 1);

    const normalizedPoints = data.map((value, index) => ({
      x: padding + index * xStep,
      y: height - padding - ((value - min) / range) * (height - padding * 2),
      value,
    }));

    // Create smooth curve path
    const linePath = normalizedPoints.reduce((acc, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;

      const prev = normalizedPoints[index - 1]!;
      const cpX = (prev.x + point.x) / 2;
      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
    }, "");

    // Create area path
    const areaPathStr = showArea
      ? `${linePath} L ${normalizedPoints[normalizedPoints.length - 1]!.x} ${height - padding} L ${padding} ${height - padding} Z`
      : "";

    // Calculate trend (percentage change)
    const trendValue = data.length >= 2
      ? ((data[data.length - 1]! - data[0]!) / (data[0]! || 1)) * 100
      : 0;

    return {
      path: linePath,
      areaPath: areaPathStr,
      points: normalizedPoints,
      trend: trendValue,
    };
  }, [data, width, height, showArea]);

  if (!data.length) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-zinc-400 ${className}`}
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Area fill */}
        {showArea && (
          <path
            d={areaPath}
            fill={colors.fill}
            className="opacity-100 transition-opacity duration-500"
          />
        )}

        {/* Line path */}
        <path
          d={path}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? "animate-draw" : ""}
          style={animated ? {
            strokeDasharray: 1000,
            strokeDashoffset: 0,
            animation: "draw 1s ease-out forwards"
          } : undefined}
        />
        {/* Add minimal keyframes for pure CSS draw animation if not global */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes draw {
            from { stroke-dashoffset: 1000; }
            to { stroke-dashoffset: 0; }
          }
        `}} />

        {/* Dots */}
        {showDots && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={3}
            fill={colors.dot}
            className="transition-opacity duration-200"
            style={{ transitionDelay: `${index * 50}ms` }}
          />
        ))}

        {/* End dot (always show last point) */}
        {!showDots && points.length > 0 && (
          <circle
            cx={points[points.length - 1]!.x}
            cy={points[points.length - 1]!.y}
            r={4}
            fill={colors.dot}
          />
        )}
      </svg>

      {/* Trend indicator */}
      {showTrend && (
        <div
          className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${trend >= 0
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
            } animate-in fade-in slide-in-from-bottom-1 duration-300 delay-1000`}
        >
          {trend >= 0 ? "+" : ""}{trend.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

export default memo(Sparkline);

