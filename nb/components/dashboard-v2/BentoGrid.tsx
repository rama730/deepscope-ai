"use client";

import { ReactNode, memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BentoItemProps {
  children: ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  featured?: boolean;
  glowColor?: "indigo" | "emerald" | "amber" | "rose" | "purple" | "cyan" | "none";
  delay?: number;
}

interface BentoGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

const colSpanClasses = {
  1: "col-span-1",
  2: "col-span-1 md:col-span-2",
  3: "col-span-1 md:col-span-2 lg:col-span-3",
};

const rowSpanClasses = {
  1: "row-span-1",
  2: "row-span-1 md:row-span-2",
};

const glowColors = {
  none: "",
  indigo: "hover:shadow-indigo-500/20 dark:hover:shadow-indigo-400/10",
  emerald: "hover:shadow-emerald-500/20 dark:hover:shadow-emerald-400/10",
  amber: "hover:shadow-amber-500/20 dark:hover:shadow-amber-400/10",
  rose: "hover:shadow-rose-500/20 dark:hover:shadow-rose-400/10",
  purple: "hover:shadow-purple-500/20 dark:hover:shadow-purple-400/10",
  cyan: "hover:shadow-cyan-500/20 dark:hover:shadow-cyan-400/10",
};

const gapClasses = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
};

const columnClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

export function BentoItem({
  children,
  className,
  colSpan = 1,
  rowSpan = 1,
  featured = false,
  glowColor = "indigo",
  delay = 0,
}: BentoItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      whileHover={{ 
        scale: 1.01,
        y: -2,
        transition: { duration: 0.2 }
      }}
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200/80 dark:border-zinc-800/80",
        "shadow-sm hover:shadow-xl",
        "transition-all duration-300",
        glowColors[glowColor],
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        featured && [
          "ring-1 ring-indigo-500/20 dark:ring-indigo-400/20",
          "bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30",
          "dark:from-zinc-900 dark:via-indigo-900/10 dark:to-purple-900/10",
        ],
        className
      )}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-indigo-500/5 dark:from-zinc-900/0 dark:via-zinc-900/0 dark:to-indigo-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
      
      {/* Featured indicator */}
      {featured && (
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
          <div className="absolute top-2 right-[-20px] w-[80px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-semibold py-0.5 text-center transform rotate-45">
            Featured
          </div>
        </div>
      )}
    </motion.div>
  );
}

function BentoGrid({
  children,
  columns = 3,
  gap = "md",
  className,
}: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid auto-rows-min",
        columnClasses[columns],
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

export default memo(BentoGrid);

