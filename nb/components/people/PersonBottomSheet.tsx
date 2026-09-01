"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, MessageSquare, Briefcase, ExternalLink } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { profileHref } from "@/lib/routing/identifiers";
import { projectHref } from "@/lib/routing/identifiers";
import ProjectInviteModal from "@/components/projects/ProjectInviteModal";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  location?: string | null;
  headline?: string | null;
  suggestionReason?: string;
  suggestionReasons?: any;
  connectionStrength?: number;
  score?: number;
}

type ConnectionState = "none" | "pending_outgoing" | "pending_incoming" | "accepted";

interface ActiveProject {
  id: string;
  title: string;
  slug: string | null;
  role?: string | null;
  status?: string;
}

interface PersonBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  connectionState: ConnectionState;
  currentUserId: string | null;
  selectedProjectId: string | null;
  onConnect: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

export default function PersonBottomSheet({
  isOpen,
  onClose,
  profile,
  connectionState,
  currentUserId,
  selectedProjectId,
  onConnect,
  onAccept,
  onDecline,
}: PersonBottomSheetProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mounted, setMounted] = useState(false);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [mutualCount, setMutualCount] = useState<number | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen || !profile?.id) {
      setActiveProjects([]);
      setSkills([]);
      setMutualCount(null);
      return;
    }

    let alive = true;

    async function loadExpandedInfo() {
      if (!profile) return;
      setLoadingProjects(true);
      try {
        const [created, collab] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, slug, status")
            .eq("creator_id", profile.id)
            .in("status", ["open", "in_progress"])
            .order("updated_at", { ascending: false })
            .limit(3),
          supabase
            .from("project_collaborators")
            .select("project_id, role, projects(id, title, slug, status)")
            .eq("user_id", profile.id)
            .in("role", ["owner", "admin", "member"]),
        ]);

        const projects: ActiveProject[] = [];
        (created.data || []).forEach((p: any) => {
          projects.push({ id: p.id, title: p.title, slug: p.slug || null, status: p.status, role: "Creator" });
        });
        (collab.data || []).forEach((c: any) => {
          if (c.projects && (c.projects.status === "open" || c.projects.status === "in_progress")) {
            projects.push({
              id: c.projects.id,
              title: c.projects.title,
              slug: c.projects.slug || null,
              status: c.projects.status,
              role: c.role || "Member",
            });
          }
        });

        const { data: skillsData } = await supabase
          .from("skills")
          .select("skill_name")
          .eq("user_id", profile.id)
          .order("is_featured", { ascending: false })
          .limit(8);

        let mutual = null;
        if (currentUserId && profile.suggestionReasons?.mutual_connections !== undefined) {
          mutual = profile.suggestionReasons.mutual_connections;
        } else if (currentUserId) {
          try {
            const { data } = await supabase.rpc("get_mutual_connections_count", {
              user1_id: currentUserId,
              user2_id: profile.id,
            });
            mutual = data || 0;
          } catch {
            // RPC might not exist
          }
        }

        if (alive) {
          setActiveProjects(projects);
          setSkills((skillsData || []).map((s) => s.skill_name));
          setMutualCount(mutual);
        }
      } catch (error) {
        console.error("Error loading expanded info:", error);
      } finally {
        if (alive) setLoadingProjects(false);
      }
    }

    loadExpandedInfo();

    return () => {
      alive = false;
    };
  }, [isOpen, profile?.id, currentUserId, supabase]);

  const reasonChips = useMemo(() => {
    if (!profile) return [];
    const reasons: string[] = [];
    const r = profile.suggestionReasons || {};
    if (r.mutual_connections > 0) reasons.push(`${r.mutual_connections} mutual`);
    if (r.shared_skills > 0) reasons.push(`${r.shared_skills} shared skills`);
    if (r.same_location) reasons.push("same location");
    if (r.shared_projects > 0) reasons.push(`${r.shared_projects} shared projects`);
    return reasons;
  }, [profile?.suggestionReasons, profile]);

  if (!mounted || !profile) return null;

  const matchScore = profile.connectionStrength || profile.score || 0;

  const handleInviteClick = () => {
    if (currentUserId && profile.id) {
      setShowInviteModal(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            {createPortal(
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 z-40"
              />,
              document.body
            )}

            {/* Bottom Sheet */}
            {createPortal(
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white dark:bg-zinc-900 z-50 rounded-t-2xl shadow-2xl flex flex-col"
              >
                {/* Handle */}
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.full_name || profile.username || "User"}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-800 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg border-2 border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                        {(profile.full_name || profile.username || "U")?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {profile.full_name || profile.username || "User"}
                      </div>
                      {profile.username && (
                        <div className="text-xs text-zinc-500 truncate">@{profile.username}</div>
                      )}
                      {matchScore > 0 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                          {matchScore}% match
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                < div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" >
                  {/* Headline */}
                  {
                    profile.headline && (
                      <div className="text-sm text-zinc-700 dark:text-zinc-300">{profile.headline}</div>
                    )
                  }

                  {/* Bio */}
                  {
                    profile.bio && (
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">{profile.bio}</div>
                    )
                  }

                  {/* Location */}
                  {
                    profile.location && (
                      <div className="text-sm text-zinc-500">📍 {profile.location}</div>
                    )
                  }

                  {/* Reason Chips */}
                  {
                    reasonChips.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {reasonChips.map((chip, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )
                  }

                  {/* Currently Working On */}
                  {
                    loadingProjects ? (
                      <div className="text-sm text-zinc-500" > Loading projects...</div>
                    ) : activeProjects.length > 0 ? (
                      <div>
                        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                          Currently working on
                        </div>
                        <div className="space-y-2">
                          {activeProjects.map((proj) => (
                            <Link
                              key={proj.id}
                              href={projectHref(proj)}
                              className="block p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {proj.title}
                                  </div>
                                  {proj.role && (
                                    <div className="text-xs text-zinc-500 mt-0.5">{proj.role}</div>
                                  )}
                                </div>
                                <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Skills</div>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social Proof */}
                  {mutualCount !== null && mutualCount > 0 && (
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      👥 {mutualCount} mutual connection{mutualCount !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
                  {connectionState === "none" && currentUserId !== profile.id && (
                    <button
                      onClick={onConnect}
                      className="w-full px-4 py-3 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Connect
                    </button>
                  )}
                  {connectionState === "pending_outgoing" && (
                    <div className="w-full px-4 py-3 text-sm text-center rounded-lg border text-zinc-500">
                      Connection request sent
                    </div>
                  )}
                  {connectionState === "pending_incoming" && (
                    <div className="flex gap-2">
                      <button
                        onClick={onAccept}
                        className="flex-1 px-4 py-3 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={onDecline}
                        className="flex-1 px-4 py-3 text-sm rounded-lg border hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {connectionState === "accepted" && (
                    <>
                      <Link
                        href={`/messages?userId=${profile.id}`}
                        className="block w-full px-4 py-3 text-sm font-medium rounded-lg border hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-center flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Message
                      </Link>
                      {selectedProjectId && (
                        <button
                          onClick={handleInviteClick}
                          className="w-full px-4 py-3 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Briefcase className="w-4 h-4" />
                          Invite to project
                        </button>
                      )}
                    </>
                  )}
                  <Link
                    href={profileHref(profile)}
                    className="block w-full px-4 py-3 text-sm rounded-lg border hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-center"
                  >
                    View full profile
                  </Link>
                </div>
              </motion.div >,
              document.body
            )
            }
          </>
        )}
      </AnimatePresence >

      {/* Invite Modal */}
      {
        currentUserId && profile && (
          <ProjectInviteModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            currentUserId={currentUserId}
            invitee={{
              id: profile.id,
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            }}
          />
        )
      }
    </>
  );
}

