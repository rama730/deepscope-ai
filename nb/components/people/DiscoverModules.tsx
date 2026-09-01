"use client";

import { useMemo } from "react";
import { Users, Sparkles, Briefcase, Clock, Globe } from "lucide-react";
import PersonCard from "./PersonCard";

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
  created_at?: string;
  skills?: { skill_name: string }[];
  created_projects?: any[];
  collab_projects?: any[];
}

type ConnectionState = "none" | "pending_outgoing" | "pending_incoming" | "accepted";

interface DiscoverModulesProps {
  profiles: Profile[];
  connectionStates: Record<string, ConnectionState>;
  currentUserId: string | null;
  selectedProjectId: string | null;
  onConnect: (profileId: string) => void;
  onAccept: (profileId: string) => void;
  onDecline: (profileId: string) => void;
  onUnfriend: (profileId: string) => void;
  onInvite?: (profileId: string) => void;
  onMobileExpand?: (profile: Profile) => void;
}

export default function DiscoverModules({
  profiles,
  connectionStates,
  currentUserId,
  selectedProjectId,
  onConnect,
  onAccept,
  onDecline,
  onUnfriend,
  onInvite,
  onMobileExpand,
}: DiscoverModulesProps) {
  // Categorize profiles into modules
  const modules = useMemo(() => {
    const bestMatches: Profile[] = [];
    const warmIntros: Profile[] = [];
    const roleFit: Profile[] = [];
    const recentlyActive: Profile[] = [];
    const outsideNetwork: Profile[] = [];

    profiles.forEach((profile) => {
      const score = profile.connectionStrength || profile.score || 0;
      const reasons = profile.suggestionReasons || {};
      const mutuals = reasons.mutual_connections || 0;
      const sharedSkills = reasons.shared_skills || 0;
      const sharedProjects = reasons.shared_projects || 0;

      // Best matches: high score (>70) or strong signals
      if (score > 70 || (mutuals > 2 && sharedSkills > 1)) {
        bestMatches.push(profile);
      }
      // Warm intros: mutual connections > 0
      else if (mutuals > 0) {
        warmIntros.push(profile);
      }
      // Role fit: shared skills or projects
      else if (sharedSkills > 0 || sharedProjects > 0) {
        roleFit.push(profile);
      }
      // Recently active: created recently
      else if (profile.created_at) {
        const daysSinceCreated = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated < 30) {
          recentlyActive.push(profile);
        } else {
          outsideNetwork.push(profile);
        }
      }
      // Outside network: everything else
      else {
        outsideNetwork.push(profile);
      }
    });

    // Sort each module
    bestMatches.sort((a, b) => (b.connectionStrength || b.score || 0) - (a.connectionStrength || a.score || 0));
    warmIntros.sort((a, b) => {
      const aMutuals = a.suggestionReasons?.mutual_connections || 0;
      const bMutuals = b.suggestionReasons?.mutual_connections || 0;
      return bMutuals - aMutuals;
    });
    roleFit.sort((a, b) => {
      const aScore = a.connectionStrength || a.score || 0;
      const bScore = b.connectionStrength || b.score || 0;
      return bScore - aScore;
    });
    recentlyActive.sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return {
      bestMatches: bestMatches.slice(0, 6),
      warmIntros: warmIntros.slice(0, 6),
      roleFit: roleFit.slice(0, 6),
      recentlyActive: recentlyActive.slice(0, 6),
      outsideNetwork: outsideNetwork.slice(0, 12),
    };
  }, [profiles, connectionStates]);

  const ModuleSection = ({
    title,
    icon: Icon,
    profiles: moduleProfiles,
    description,
    variant = "standard"
  }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    profiles: Profile[];
    description?: string;
    variant?: "standard" | "spotlight";
  }) => {
    if (moduleProfiles.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
          {description && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">— {description}</span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {moduleProfiles.map((profile) => {
            // Transform batch data to initial props
            const initialSkills = profile.skills?.map(s => s.skill_name) || [];

            const initialProjects = [
              ...(profile.created_projects || []).map((p: any) => ({
                id: p.id,
                title: p.title,
                slug: p.slug,
                status: p.status,
                role: "Creator",
                technologies_used: p.technologies_used
              })),
              ...(profile.collab_projects || []).map((c: any) => ({
                id: c.project?.id,
                title: c.project?.title,
                slug: c.project?.slug,
                status: c.project?.status,
                role: c.role || "Member",
                technologies_used: c.project?.technologies_used
              }))
            ].slice(0, 2); // Limit to 2

            return (
              <PersonCard
                key={profile.id}
                profile={profile}
                connectionState={connectionStates[profile.id] || "none"}
                currentUserId={currentUserId}
                selectedProjectId={selectedProjectId}
                onConnect={() => onConnect(profile.id)}
                onAccept={() => onAccept(profile.id)}
                onDecline={() => onDecline(profile.id)}
                onUnfriend={() => onUnfriend(profile.id)}
                onInvite={onInvite ? () => onInvite(profile.id) : undefined}
                onMobileExpand={onMobileExpand}
                variant={variant}
                initialSkills={initialSkills}
                initialProjects={initialProjects}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <ModuleSection
        title="Best Matches"
        icon={Sparkles}
        profiles={modules.bestMatches}
        description="Top candidates for your project"
        variant="spotlight"
      />
      <ModuleSection
        title="Warm Introductions"
        icon={Users}
        profiles={modules.warmIntros}
        description="People in your network"
      />
      <ModuleSection
        title="Role Fit"
        icon={Briefcase}
        profiles={modules.roleFit}
        description="Skills and project alignment"
      />
      <ModuleSection
        title="Recently Active"
        icon={Clock}
        profiles={modules.recentlyActive}
        description="New members on the platform"
      />
      <ModuleSection
        title="Outside Your Network"
        icon={Globe}
        profiles={modules.outsideNetwork}
        description="Expand your reach"
      />
    </div>
  );
}

