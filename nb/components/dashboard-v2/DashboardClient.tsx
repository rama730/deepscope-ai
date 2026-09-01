"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Layers,
  Activity,
  Star,
  Users,
  FolderOpen,
  TrendingUp,
  Clock,
} from "lucide-react";

// Enhanced dashboard components
import { HeroSection } from "@/components/dashboard-v2";
import { StatCardAdvanced } from "@/components/dashboard-v2";
import { ActivityTimeline } from "@/components/dashboard-v2";
import { CommandPalette } from "@/components/dashboard-v2";
import { VelocityChart } from "@/components/dashboard-v2";
import { UpcomingDeadlines } from "@/components/dashboard-v2";
import { GlassCard } from "@/components/dashboard-v2";

import { VerificationBanner } from "@/components/auth/VerificationBanner";

// Generate mock velocity data
function generateVelocityData() {
  const data = [];
  for (let i = 0; i < 14; i++) {
    data.push(Math.floor(Math.random() * 8) + 2);
  }
  return data;
}

interface DashboardClientProps {
  stats: any;
  activity: any[];
  summary: any;
}

export default function DashboardClient({ stats, activity, summary }: DashboardClientProps) {
  const router = useRouter();

  // Mock data for enhanced components
  const velocityData = useMemo(() => generateVelocityData(), []);
  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Transform activity data for timeline
  const timelineActivities = useMemo(() => {
    return activity.map((item, index) => ({
      id: `activity-${index}`,
      type: item.type === "project" 
        ? "task_created" 
        : item.type === "skill" 
        ? "project_updated" 
        : "file_uploaded" as any,
      title: item.title,
      description: item.description || undefined,
      actor: {
        name: summary?.userName || "You",
        id: "current-user",
      },
      created_at: item.date,
    }));
  }, [activity, summary]);

  // Mock deadlines (in a real app, fetch from API)
  const deadlines = useMemo(() => {
    const now = new Date();
    return [
      {
        id: "1",
        title: "Complete project documentation",
        dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        type: "task" as const,
        priority: "high" as const,
        projectName: "Website Redesign",
      },
      {
        id: "2",
        title: "Review pull requests",
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        type: "task" as const,
        priority: "medium" as const,
        projectName: "API Development",
      },
      {
        id: "3",
        title: "Sprint planning meeting",
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        type: "milestone" as const,
        priority: "medium" as const,
      },
      {
        id: "4",
        title: "Deploy to production",
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: "project" as const,
        priority: "urgent" as const,
        projectName: "Mobile App",
      },
    ];
  }, []);

  // Sparkline data for stats
  const sparklineData = {
    items: [3, 5, 2, 8, 4, 6, 7, 5, 9, 6],
    projects: [2, 3, 2, 4, 5, 4, 6, 7, 6, 8],
    profile: [20, 35, 40, 55, 60, 65, 70, 75, 80, summary?.profileStrength || 0],
    activity: [5, 8, 3, 6, 9, 7, 4, 8, 5, activity.length],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Ambient background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <VerificationBanner />

          {/* Hero Command Center */}
          <HeroSection
            userName={summary?.userName || "User"}
            message={summary?.message}
            profileStrength={summary?.profileStrength || 0}
            urgentTasks={deadlines.filter((d) => d.priority === "urgent").length}
            tasksToday={deadlines.filter((d) => {
              const dueDate = new Date(d.dueDate);
              const today = new Date();
              return dueDate.toDateString() === today.toDateString();
            }).length}
            streak={7} // Mock streak data
            onFocusClick={() => router.push("/projects")}
          />

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            <StatCardAdvanced
              title="Total Items"
              value={stats?.totalItems || 0}
              icon={Layers}
              color="indigo"
              description="Across all categories"
              sparklineData={sparklineData.items}
              trend={{
                value: 12,
                direction: "up",
                label: "vs last month",
              }}
              onClick={() => router.push("/hub")}
            />
            <StatCardAdvanced
              title="Active Projects"
              value={stats?.productsCount || stats?.activeItems || 0}
              icon={Briefcase}
              color="emerald"
              description="Currently active"
              sparklineData={sparklineData.projects}
              trend={{
                value: 8,
                direction: "up",
                label: "vs last month",
              }}
              onClick={() => router.push("/hub")}
            />
            <StatCardAdvanced
              title="Profile Strength"
              value={summary?.profileStrength || 0}
              icon={Star}
              color="amber"
              displayMode="radial"
              maxValue={100}
              description="Completion"
              onClick={() => router.push("/settings/profile")}
            />
            <StatCardAdvanced
              title="Recent Activity"
              value={activity.length}
              icon={Activity}
              color="purple"
              description="In the last 30 days"
              sparklineData={sparklineData.activity}
              trend={{
                value: activity.length > 5 ? 15 : -5,
                direction: activity.length > 5 ? "up" : "down",
              }}
            />
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Velocity Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <VelocityChart
                  data={velocityData}
                  labels={weekLabels}
                  currentVelocity={velocityData.slice(-7).reduce((a, b) => a + b, 0)}
                  averageVelocity={Math.round(
                    velocityData.reduce((a, b) => a + b, 0) / velocityData.length
                  )}
                  targetVelocity={40}
                  period="weekly"
                />
              </motion.div>

              {/* Activity Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <GlassCard variant="elevated" padding="lg">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Recent Activity
                  </h2>
                  <ActivityTimeline
                    activities={timelineActivities}
                    maxItems={5}
                    showSummary
                    showFilters
                  />
                </GlassCard>
              </motion.div>
            </div>

            {/* Right Column - 1/3 width */}
            <div className="space-y-6">
              {/* Command Palette */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <CommandPalette
                  onCreateProject={() => router.push("/projects/create")}
                  onCreateTask={() => router.push("/projects")}
                  onOpenMessages={() => router.push("/messages")}
                  onOpenAnalytics={() => router.push("/analytics")}
                  onOpenSettings={() => router.push("/settings")}
                  onOpenProfile={() => router.push("/settings/profile")}
                  onOpenCalendar={() => router.push("/reading-list")}
                  onOpenTeam={() => router.push("/people")}
                />
              </motion.div>

              {/* Upcoming Deadlines */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <UpcomingDeadlines
                  deadlines={deadlines}
                  maxItems={4}
                  onDeadlineClick={(deadline) => {
                    console.log("Clicked deadline:", deadline);
                  }}
                  onViewAll={() => router.push("/reading-list")}
                />
              </motion.div>

              {/* Quick Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <GlassCard variant="gradient" padding="lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Quick Stats
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        This month
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          Connections
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {stats?.connectionsCount || 0}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-cyan-500" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          Files uploaded
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {stats?.filesCount || 0}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          Hours active
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {Math.round(activity.length * 0.8) || 0}h
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

