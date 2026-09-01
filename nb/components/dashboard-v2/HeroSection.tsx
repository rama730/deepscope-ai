"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  ArrowRight, 
  Target, 
  Clock, 
  Flame,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  userName: string;
  message?: string;
  profileStrength?: number;
  urgentTasks?: number;
  tasksToday?: number;
  streak?: number;
  onFocusClick?: () => void;
  className?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function HeroSection({
  userName,
  message,
  profileStrength = 0,
  urgentTasks = 0,
  tasksToday = 0,
  streak = 0,
  onFocusClick,
  className,
}: HeroSectionProps) {
  const greeting = useMemo(() => getGreeting(), []);
  
  // Dynamic contextual message
  const contextMessage = useMemo(() => {
    if (message) return message;
    if (urgentTasks > 0) return `You have ${urgentTasks} urgent task${urgentTasks > 1 ? 's' : ''} that need attention`;
    if (tasksToday > 0) return `${tasksToday} task${tasksToday > 1 ? 's' : ''} scheduled for today`;
    if (profileStrength < 50) return "Complete your profile to unlock full features";
    return "Ready to be productive today?";
  }, [message, urgentTasks, tasksToday, profileStrength]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-3xl",
        "bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800",
        "dark:from-indigo-900 dark:via-purple-900 dark:to-zinc-900",
        "p-6 sm:p-8",
        className
      )}
    >
      {/* Background patterns */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -left-1/4 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Top row - Greeting and quick stats */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-2"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span className="text-indigo-200 text-sm font-medium">
                {greeting}
              </span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-4xl font-bold text-white mb-2"
            >
              {userName}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-indigo-200/90 max-w-md"
            >
              {contextMessage}
            </motion.p>
          </div>

          {/* Quick insight badges */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-2"
          >
            {urgentTasks > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-400/30 backdrop-blur-sm">
                <Flame className="w-4 h-4 text-red-300" />
                <span className="text-sm font-medium text-red-100">
                  {urgentTasks} urgent
                </span>
              </div>
            )}
            
            {tasksToday > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900/10 border border-white/20 backdrop-blur-sm">
                <Calendar className="w-4 h-4 text-indigo-200" />
                <span className="text-sm font-medium text-white">
                  {tasksToday} today
                </span>
              </div>
            )}
            
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 backdrop-blur-sm">
                <Flame className="w-4 h-4 text-amber-300" />
                <span className="text-sm font-medium text-amber-100">
                  {streak} day streak
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom row - Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap items-center gap-3"
        >
          {/* Focus mode button */}
          <motion.button
            onClick={onFocusClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group flex items-center gap-2 px-5 py-2.5 rounded-xl",
              "bg-white dark:bg-zinc-900 text-indigo-700 font-semibold",
              "shadow-lg shadow-indigo-900/20",
              "hover:shadow-xl hover:shadow-indigo-900/30",
              "transition-all duration-200"
            )}
          >
            <Target className="w-5 h-5" />
            <span>Enter Focus Mode</span>
            <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
          </motion.button>

          {/* Secondary actions */}
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900/10 text-white font-medium border border-white/20 hover:bg-white dark:bg-zinc-900/20 transition-colors">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">View Schedule</span>
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900/10 text-white font-medium border border-white/20 hover:bg-white dark:bg-zinc-900/20 transition-colors">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Task</span>
          </button>
        </motion.div>

        {/* Profile strength indicator (subtle) */}
        {profileStrength < 100 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 pt-4 border-t border-white/10"
          >
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-indigo-200">Profile Strength</span>
              <span className="text-white font-semibold">{profileStrength}%</span>
            </div>
            <div className="h-1.5 bg-white dark:bg-zinc-900/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${profileStrength}%` }}
                transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(HeroSection);

