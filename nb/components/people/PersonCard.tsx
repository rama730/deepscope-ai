"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { UserPlus, MessageSquare, Briefcase, Sparkles, Layers, MapPin, Users, Building2 } from "lucide-react";
import { profileHref } from "@/lib/routing/identifiers";
import { projectHref } from "@/lib/routing/identifiers";
import { cn } from "@/lib/utils";
import ProjectInviteModal from "@/components/projects/ProjectInviteModal";
import { useResponsive } from "@/hooks/useResponsive";

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
  technologies_used?: string[];
}

interface PersonCardProps {
  profile: Profile;
  connectionState: ConnectionState;
  currentUserId: string | null;
  selectedProjectId: string | null;
  onConnect: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onUnfriend: () => void;
  onInvite?: () => void;
  onMobileExpand?: (profile: Profile) => void;
  variant?: "standard" | "spotlight";
  initialProjects?: ActiveProject[];
  initialSkills?: string[];
}

export default function PersonCard({
  profile,
  connectionState,
  currentUserId,
  selectedProjectId,
  onConnect,
  onAccept,
  onDecline,
  onMobileExpand,
  variant = "standard",
  initialProjects,
  initialSkills
}: PersonCardProps) {
  const supabase = createSupabaseBrowserClient();
  const { isMobile } = useResponsive();
  const [isHovered, setIsHovered] = useState(false);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>(initialProjects || []);
  const [skills, setSkills] = useState<string[]>(initialSkills || []);
  const [showInviteModal, setShowInviteModal] = useState(false);
  // Mark data as loaded if we have props
  const [dataLoaded, setDataLoaded] = useState(!!(initialProjects || initialSkills));

  // Load Info
  useEffect(() => {
    // If we already have data from props or previous load, skip
    if (dataLoaded) return;

    // For spotlight, load immediately. For standard, load on hover or if already loaded.
    if (variant !== "spotlight" && !isHovered) return;
    if (!profile.id) return;

    let alive = true;

    async function loadExpandedInfo() {
      try {
        // Load active projects (creator or collaborator)
        const [created, collab] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, slug, status, technologies_used")
            .eq("creator_id", profile.id)
            .in("status", ["open", "in_progress"])
            .order("updated_at", { ascending: false })
            .limit(2),
          supabase
            .from("project_collaborators")
            .select("project_id, role, projects(id, title, slug, status, technologies_used)")
            .eq("user_id", profile.id)
            .in("role", ["owner", "admin", "member"]),
        ]);

        const projects: ActiveProject[] = [];
        (created.data || []).forEach((p: any) => {
          projects.push({
            id: p.id,
            title: p.title,
            slug: p.slug || null,
            status: p.status,
            role: "Creator",
            technologies_used: p.technologies_used
          });
        });
        (collab.data || []).forEach((c: any) => {
          if (c.projects && (c.projects.status === "open" || c.projects.status === "in_progress")) {
            projects.push({
              id: c.projects.id,
              title: c.projects.title,
              slug: c.projects.slug || null,
              status: c.projects.status,
              role: c.role || "Member",
              technologies_used: c.projects.technologies_used
            });
          }
        });

        // Load skills
        const { data: skillsData } = await supabase
          .from("skills")
          .select("skill_name")
          .eq("user_id", profile.id)
          .order("is_featured", { ascending: false })
          .limit(5);

        if (alive) {
          setActiveProjects(projects.slice(0, 2));
          setSkills((skillsData || []).map((s) => s.skill_name));
          setDataLoaded(true);
        }
      } catch (error) {
        console.error("Error loading expanded info:", error);
      }
    }

    loadExpandedInfo();

    return () => {
      alive = false;
    };
  }, [isHovered, profile.id, currentUserId, supabase, variant, dataLoaded, profile.suggestionReasons]);

  const matchScore = profile.connectionStrength || profile.score || 0;

  // Context Header Logic
  const contextHeader = useMemo(() => {
    const reasons = profile.suggestionReasons || {};

    if (reasons.mutual_connections > 0) {
      return {
        icon: Users,
        label: `${reasons.mutual_connections} Mutual Connection${reasons.mutual_connections > 1 ? 's' : ''}`,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/20"
      };
    }
    if (reasons.shared_skills > 0) {
      return {
        icon: Sparkles,
        label: `${reasons.shared_skills} Shared Skill${reasons.shared_skills > 1 ? 's' : ''}`,
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-900/20"
      };
    }
    if (reasons.same_location) {
      return {
        icon: MapPin,
        label: "Based in same location",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-900/20"
      };
    }
    if (matchScore > 80) {
      return {
        icon: Sparkles,
        label: "Top Match",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/20"
      };
    }
    return null; // No special context
  }, [profile.suggestionReasons, matchScore]);


  const handleInviteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentUserId && profile.id) {
      setShowInviteModal(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-all duration-300 overflow-hidden",
          variant === "spotlight" ? "hover:shadow-xl hover:-translate-y-1" : "hover:shadow-lg hover:-translate-y-0.5"
        )}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        onClick={() => {
          if (isMobile && onMobileExpand) {
            onMobileExpand(profile);
          }
        }}
      >
        {/* Context Header (Only for spotlight or high relevance) */}
        {contextHeader && (variant === "spotlight" || contextHeader.label.includes("Mutual")) && (
          <div className={cn("px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center gap-2 text-xs font-semibold", contextHeader.bg, contextHeader.color)}>
            <contextHeader.icon className="w-3.5 h-3.5" />
            {contextHeader.label}
          </div>
        )}

        <div className="p-5 flex flex-col items-center text-center mt-4">
          {/* Avatar */}
          <Link href={profileHref(profile)} onClick={(e) => e.stopPropagation()} className="relative">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || "User"}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-2 border-zinc-100 dark:border-zinc-800 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 text-2xl font-bold">
                {(profile.full_name || profile.username || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </Link>

          {/* Identity */}
          <div className="mt-3 w-full">
            <Link href={profileHref(profile)} onClick={(e) => e.stopPropagation()} className="block hover:underline decoration-zinc-400 underline-offset-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg truncate px-2">
                {profile.full_name || profile.username || "User"}
              </h3>
            </Link>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-1 px-4 min-h-[1.25rem]">
              {profile.headline || profile.bio || ""}
            </div>
            {profile.location && (
              <div className="flex items-center justify-center gap-1 mt-1 text-xs text-zinc-400">
                <MapPin className="w-3 h-3" />
                {profile.location}
              </div>
            )}
          </div>
        </div>

        {/* Sliding Content */}
        <div className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-in-out",
          isHovered ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}>
          <div className="overflow-hidden">
            <div className="px-5 pb-5 pt-0 space-y-4">

              {/* Active Project */}
              {dataLoaded ? (
                activeProjects.length > 0 ? (
                  <div className="group/project">
                    <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-3 h-3" /> Current Focus
                    </div>
                    <div className="space-y-2">
                      {activeProjects.slice(0, 2).map((p) => {
                        const token = p.slug || p.id;
                        return (
                          <Link
                            key={p.id}
                            href={projectHref(p)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
                          >
                            <div className="h-8 w-8 rounded bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-100 dark:border-zinc-700">
                              <Building2 className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 truncate font-mono">
                                /{token}
                              </div>
                              <div className="text-[11px] text-zinc-700 dark:text-zinc-200 truncate">
                                {p.title}
                              </div>
                              {p.role && <div className="text-[10px] text-zinc-500 truncate">{p.role}</div>}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <span className="text-xs text-zinc-400">No active projects</span>
                  </div>
                )
              ) : (
                <div className="h-14 w-full animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {skills.slice(0, 4).map((skill, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium border border-zinc-200 dark:border-zinc-700">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                {connectionState === "none" && currentUserId !== profile.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onConnect(); }}
                    className="flex-1 h-8 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Connect
                  </button>
                )}
                {connectionState === "pending_outgoing" && (
                  <div className="flex-1 h-8 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs font-medium bg-zinc-50 dark:bg-zinc-900">
                    Pending
                  </div>
                )}
                {connectionState === "pending_incoming" && (
                  <div className="flex flex-1 gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onAccept() }} className="flex-1 h-8 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">Accept</button>
                    <button onClick={(e) => { e.stopPropagation(); onDecline() }} className="h-8 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">Decline</button>
                  </div>
                )}
                {connectionState === "accepted" && (
                  <Link href={`/messages?userId=${profile.id}`} onClick={(e) => e.stopPropagation()} className="flex-1 h-8 rounded-md border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-1.5 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message
                  </Link>
                )}

                {selectedProjectId && connectionState !== "none" && (
                  <button
                    onClick={handleInviteClick}
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                    title="Invite to project"
                  >
                    <Briefcase className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {currentUserId && profile.id && (
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
      )}
    </>
  );
}

