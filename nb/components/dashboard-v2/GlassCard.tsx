"use client";

import { ReactNode, memo } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  variant?: "default" | "elevated" | "subtle" | "gradient";
  padding?: "none" | "sm" | "md" | "lg";
  hoverEffect?: boolean;
  glowColor?: "indigo" | "emerald" | "amber" | "rose" | "purple" | "cyan" | "none";
  className?: string;
}

const paddingConfig = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

const glowConfig = {
  none: "",
  indigo: "hover:shadow-indigo-500/10 dark:hover:shadow-indigo-400/10",
  emerald: "hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10",
  amber: "hover:shadow-amber-500/10 dark:hover:shadow-amber-400/10",
  rose: "hover:shadow-rose-500/10 dark:hover:shadow-rose-400/10",
  purple: "hover:shadow-purple-500/10 dark:hover:shadow-purple-400/10",
  cyan: "hover:shadow-cyan-500/10 dark:hover:shadow-cyan-400/10",
};

function GlassCard({
  children,
  variant = "default",
  padding = "md",
  hoverEffect = true,
  glowColor = "indigo",
  className,
  ...motionProps
}: GlassCardProps) {
  const baseClasses = cn(
    "relative rounded-2xl overflow-hidden",
    "transition-all duration-300 ease-out",
    paddingConfig[padding]
  );

  const variantClasses = {
    default: cn(
      "bg-white/80 dark:bg-zinc-900/80",
      "backdrop-blur-xl",
      "border border-zinc-200/50 dark:border-zinc-700/50",
      "shadow-lg shadow-zinc-200/20 dark:shadow-zinc-900/30"
    ),
    elevated: cn(
      "bg-white dark:bg-zinc-900",
      "border border-zinc-200 dark:border-zinc-800",
      "shadow-xl shadow-zinc-300/30 dark:shadow-zinc-900/50"
    ),
    subtle: cn(
      "bg-zinc-50/50 dark:bg-zinc-800/30",
      "backdrop-blur-sm",
      "border border-zinc-200/30 dark:border-zinc-700/30"
    ),
    gradient: cn(
      "bg-gradient-to-br from-white via-white to-zinc-50",
      "dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800",
      "border border-zinc-200/60 dark:border-zinc-700/60",
      "shadow-lg"
    ),
  };

  const hoverClasses = hoverEffect
    ? cn(
        "hover:shadow-2xl hover:scale-[1.01]",
        "hover:border-zinc-300 dark:border-zinc-700/80 dark:hover:border-zinc-600/80",
        glowConfig[glowColor]
      )
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(baseClasses, variantClasses[variant], hoverClasses, className)}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

export default memo(GlassCard);

