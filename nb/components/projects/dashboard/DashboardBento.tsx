"use client";

import { memo, useMemo } from "react";
import { motion, Variants } from "framer-motion";

// Import dashboard cards
import TeamCard from "./TeamCard";
import MyTasksCard from "./MyTasksCard";
import OpenRolesCard from "./OpenRolesCard";
import WorkFeedCard from "./WorkFeedCard";
import QuickStatsCard from "./QuickStatsCard";

// Enhanced dashboard components
import { ProjectHealthCard } from "@/components/dashboard-v2";

interface DashboardBentoProps {
    project: any;
    user: any;
    tasks: any[];
    files: any[];
    members: any[];
    openRoles: any[];
    applications: any[];
    onApply?: (roleId?: string) => void;
    onViewTaskBoard?: () => void;
    onTaskClick?: (taskId: string) => void;
    onManageTeam?: () => void;
    onViewAllActivity?: () => void;
    onUploadFile?: () => void;
    onSendMessage?: () => void;
    onViewAnalytics?: () => void;
    onViewSprints?: () => void;
    onViewSettings?: () => void;
}

function DashboardBento({
    project,
    user,
    tasks,
    files,
    members,
    openRoles,
    applications,
    onApply,
    onViewTaskBoard = () => { },
    onTaskClick = () => { },
    onManageTeam,
    onViewAllActivity = () => { },
    onUploadFile = () => { },
    onSendMessage = () => { },
    onViewAnalytics = () => { },
    onViewSprints,
    onViewSettings,
}: DashboardBentoProps) {
    const currentUserId = user?.id || null;
    const isCreator = currentUserId === project?.creator_id;
    const isCollaborator = useMemo(() => {
        return members.some((m) => m.user_id === currentUserId);
    }, [members, currentUserId]);

    // Check if user has a pending application
    const hasPendingApplication = useMemo(() => {
        if (!currentUserId) return false;
        return applications.some(
            (app) => app.applicant_id === currentUserId && app.status === "pending"
        );
    }, [applications, currentUserId]);

    // Calculate quick stats
    const quickStats = useMemo(() => {
        const completedTasks = tasks.filter((t) => t.status === "done").length;
        const totalTasks = tasks.length;
        const activeTasks = tasks.filter((t) => t.status === "in_progress").length;
        const openPositions = openRoles.reduce((sum, role) => {
            const remaining = (role.count || 0) - (role.filled || 0);
            return sum + Math.max(0, remaining);
        }, 0);

        // Calculate overdue tasks
        const now = new Date();
        const overdueTasks = tasks.filter((t) => {
            if (t.status === "done" || !t.due_date) return false;
            return new Date(t.due_date) < now;
        }).length;

        // Calculate stalled tasks (no activity in 7+ days)
        const stalledTasks = tasks.filter((t) => {
            if (t.status === "done") return false;
            const lastUpdated = new Date(t.updated_at || t.created_at);
            const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceUpdate > 7;
        }).length;

        return {
            completedTasks,
            totalTasks,
            activeTasks,
            filesCount: files.length,
            membersCount: members.length + 1, // +1 for creator
            openPositions,
            overdueTasks,
            stalledTasks,
        };
    }, [tasks, files, members, openRoles]);

    // Calculate health score
    const healthScore = useMemo(() => {
        let score = 100;

        // Deduct for overdue tasks (up to 30 points)
        score -= Math.min(quickStats.overdueTasks * 10, 30);

        // Deduct for stalled tasks (up to 20 points)
        score -= Math.min(quickStats.stalledTasks * 5, 20);

        // Bonus for task completion (up to 20 points)
        if (quickStats.totalTasks > 0) {
            const completionRate = quickStats.completedTasks / quickStats.totalTasks;
            score += Math.round(completionRate * 20) - 10; // -10 to 10
        }

        // Bonus for team size
        if (quickStats.membersCount >= 3) score += 5;

        return Math.max(0, Math.min(100, score));
    }, [quickStats]);

    // Get upcoming deadlines
    const upcomingDeadlines = useMemo(() => {
        return tasks
            .filter((t) => t.status !== "done" && t.due_date)
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .slice(0, 3)
            .length;
    }, [tasks]);

    // Calculate velocity (mock for now)
    const velocityChange = useMemo(() => {
        const recentTasks = tasks.filter((t) => {
            if (t.status !== "done") return false;
            const completedDate = new Date(t.updated_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return completedDate >= weekAgo;
        }).length;

        // Simple velocity change indicator
        return recentTasks >= 3 ? 15 : recentTasks >= 1 ? 0 : -10;
    }, [tasks]);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
            },
        },
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15,
            }
        },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
            {/* Project Health Card - Featured position */}
            <motion.div
                variants={itemVariants}
                className="md:col-span-2 lg:col-span-1"
                whileHover={{ scale: 1.01, y: -2 }}
                transition={{ duration: 0.2 }}
            >
                <ProjectHealthCard
                    projectName={project?.title || "Project"}
                    healthScore={healthScore}
                    metrics={{
                        tasksCompleted: quickStats.completedTasks,
                        tasksTotal: quickStats.totalTasks,
                        overdueItems: quickStats.overdueTasks,
                        stalledTasks: quickStats.stalledTasks,
                        activeMembers: Math.max(1, Math.floor(quickStats.membersCount * 0.7)),
                        totalMembers: quickStats.membersCount,
                        velocityChange,
                        upcomingDeadlines,
                    }}
                    onViewDetails={onViewAnalytics}
                />
            </motion.div>

            {/* Tasks Card - Takes 2 columns on larger screens */}
            <motion.div
                variants={itemVariants}
                className="lg:col-span-2"
                whileHover={{ scale: 1.005, y: -2 }}
                transition={{ duration: 0.2 }}
            >
                <MyTasksCard
                    tasks={tasks}
                    currentUserId={currentUserId}
                    onViewBoard={onViewTaskBoard}
                    onTaskClick={onTaskClick}
                />
            </motion.div>

            {/* Quick Stats */}
            <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.01, y: -2 }}
                transition={{ duration: 0.2 }}
            >
                <QuickStatsCard
                    tasksCompleted={quickStats.completedTasks}
                    tasksTotal={quickStats.totalTasks}
                    tasksPending={quickStats.activeTasks}
                    filesCount={quickStats.filesCount}
                    membersCount={quickStats.membersCount}
                    chatMessagesCount={0}
                />
            </motion.div>

            {/* Team Card */}
            <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.01, y: -2 }}
                transition={{ duration: 0.2 }}
            >
                <TeamCard
                    project={project}
                    members={members}
                    isCreator={isCreator}
                    onManageTeam={onManageTeam}
                />
            </motion.div>

            {/* Open Roles Card */}
            <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.01, y: -2 }}
                transition={{ duration: 0.2 }}
            >
                <OpenRolesCard
                    roles={openRoles}
                    hasPendingApplication={hasPendingApplication}
                    isCollaborator={isCollaborator}
                    isCreator={isCreator}
                    onApply={onApply}
                />
            </motion.div>

            {/* Work Feed Card - Takes full width on md, 2 columns on lg */}
            <motion.div
                variants={itemVariants}
                className="md:col-span-2"
                whileHover={{ scale: 1.005, y: -2 }}
                transition={{ duration: 0.2 }}
            >
                <WorkFeedCard
                    activities={[]}
                    isCreator={isCreator}
                    currentUserId={currentUserId}
                    onUploadFile={onUploadFile}
                    onSendMessage={onSendMessage}
                    onViewAnalytics={onViewAnalytics}
                    onViewAllActivity={onViewAllActivity}
                    onViewSprints={onViewSprints}
                    onViewSettings={onViewSettings}
                />
            </motion.div>
        </motion.div>
    );
}

export default memo(DashboardBento);
