"use client";

import { useState, useEffect } from "react";
import { FileText, Clock, CheckCircle, XCircle, User } from "lucide-react";
import { motion } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import DashboardCard from "./DashboardCard";
import type { Application } from "@/lib/types/application";


interface ApplicationsCardProps {
  applications?: Application[]; // Make optional since we'll load our own
  projectId: string;
  onManageApplications: () => void;
  isCreator: boolean;
}


export default function ApplicationsCard({
  applications: initialApplications,
  projectId,
  onManageApplications,
  isCreator,
}: ApplicationsCardProps) {
  const supabase = createSupabaseBrowserClient();
  const [applications, setApplications] = useState<Application[]>(initialApplications || []);
  const [loading, setLoading] = useState(!initialApplications || initialApplications.length === 0);

  useEffect(() => {
    if (projectId && isCreator) {
      loadApplications();

      // Real-time subscription
      const channel = supabase
        .channel(`project_applications_card:${projectId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_applications",
            filter: `project_id=eq.${projectId}`,
          },
          () => {
            loadApplications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isCreator, supabase]);

  async function loadApplications() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Try loading from project_applications table first
      const { data: appsData, error: appsError } = await supabase
        .from("project_applications")
        .select("*, profiles:applicant_id(full_name, username, id)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (!appsError && appsData && appsData.length > 0) {
        // Map the data to match the expected format
        const mappedApps: Application[] = appsData.map((app: any) => ({
          id: app.id,
          status: app.status || "pending",
          role_applied_for: app.role_applied_for || "General Application",
          created_at: app.created_at,
          message: app.message || "", // Required by type
          project_id: projectId,      // Required by type
          applicant_id: app.applicant_id, // Required by type
          work_timings: app.work_timings,
          portfolio_link: app.portfolio_link,
          applicant_profile: Array.isArray(app.profiles)
            ? app.profiles[0]
            : app.profiles || null
        }));
        setApplications(mappedApps);
        setLoading(false);
        return;
      }
      setApplications([]);
    } catch (err) {
      console.error("Exception loading applications:", err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }

  if (!isCreator) return null;

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const recentApplications = applications.slice(0, 3);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  };

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/30",
      label: "Pending",
    },
    accepted: {
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      label: "Accepted",
    },
    rejected: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/30",
      label: "Rejected",
    },
    withdrawn: {
      icon: XCircle,
      color: "text-slate-500",
      bg: "bg-slate-50 dark:bg-zinc-800",
      label: "Withdrawn",
    },
  };

  return (
    <DashboardCard
      title="Applications"
      icon={FileText}
      iconColor="text-cyan-500 dark:text-cyan-400"
      badge={pendingCount > 0 ? { count: pendingCount, variant: "warning" } : undefined}
      action={{ label: "Manage", onClick: onManageApplications }}
      compact
    >
      {recentApplications.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-1.5"
        >
          {recentApplications.map((app) => {
            const status = statusConfig[app.status];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={app.id}
                variants={itemVariants}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                onClick={onManageApplications}
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {(() => {
                    const profile = Array.isArray(app.applicant_profile) ? app.applicant_profile[0] : app.applicant_profile;
                    return profile?.full_name?.[0]?.toUpperCase() ||
                      profile?.username?.[0]?.toUpperCase() ||
                      <User className="w-3 h-3" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-100 truncate">
                    {(() => {
                      const profile = Array.isArray(app.applicant_profile) ? app.applicant_profile[0] : app.applicant_profile;
                      return profile?.full_name || profile?.username || "Applicant";
                    })()}
                  </p>
                </div>
                <StatusIcon className={`w-3.5 h-3.5 ${status.color} flex-shrink-0`} />
              </motion.div>
            );
          })}

          {applications.length > 3 && (
            <motion.button
              variants={itemVariants}
              onClick={onManageApplications}
              className="w-full py-1.5 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              +{applications.length - 3} more
            </motion.button>
          )}
        </motion.div>
      ) : loading ? (
        <div className="text-center py-3">
          <div className="w-6 h-6 border-2 border-slate-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Loading...
          </p>
        </div>
      ) : (
        <div className="text-center py-3">
          <FileText className="w-6 h-6 text-slate-300 dark:text-zinc-600 mx-auto mb-1" />
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            No applications
          </p>
        </div>
      )}
    </DashboardCard>
  );
}

