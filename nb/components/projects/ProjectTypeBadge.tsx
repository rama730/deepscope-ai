"use client";

import {
  Rocket,
  FlaskConical,
  Trophy,
  GraduationCap,
  Briefcase,
  Code,
  Users,
  Lightbulb,
  Target,
  Plus,
  LucideIcon,
} from "lucide-react";

interface ProjectTypeBadgeProps {
  projectType: string;
  customType?: string | null;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const PROJECT_TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string; borderColor: string }> = {
  startup: {
    icon: Rocket,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  research: {
    icon: FlaskConical,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  hackathon: {
    icon: Trophy,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  course: {
    icon: GraduationCap,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  portfolio: {
    icon: Briefcase,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
  open_source: {
    icon: Code,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  freelance_client: {
    icon: Users,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    borderColor: "border-cyan-200 dark:border-cyan-800",
  },
  skill_development: {
    icon: Lightbulb,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  game_development: {
    icon: Target,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    borderColor: "border-pink-200 dark:border-pink-800",
  },
  other: {
    icon: Plus,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
    borderColor: "border-slate-200 dark:border-slate-700",
  },
};

export default function ProjectTypeBadge({ projectType, customType, size = "md", showIcon = true }: ProjectTypeBadgeProps) {
  const config = PROJECT_TYPE_CONFIG[projectType] || PROJECT_TYPE_CONFIG.other;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-3 py-1",
    lg: "text-sm px-4 py-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const displayText = projectType === "other" && customType ? customType : 
    projectType === "open_source" ? "Open Source" :
    projectType === "freelance_client" ? "Client Project" :
    projectType === "skill_development" ? "Skill Development" :
    projectType === "game_development" ? "Game Development" :
    projectType.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${sizeClasses[size]} ${config.bgColor} ${config.color} ${config.borderColor}`}>
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{displayText}</span>
    </span>
  );
}

