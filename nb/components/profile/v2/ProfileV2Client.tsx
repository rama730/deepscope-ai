"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui-custom/Toast";
import dynamic from "next/dynamic";

import { ProfileShell } from "./ProfileShell";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileTabs } from "./ProfileTabs";
import { ProfileRightRail } from "./ProfileRightRail";

import { AboutCard } from "./sections/AboutCard";
import { FeaturedProjectsCard } from "./sections/FeaturedProjectsCard";
import { ExperienceCard } from "./sections/ExperienceCard";
import { EducationCard } from "./sections/EducationCard";
import { SkillsCard } from "./sections/SkillsCard";
import { ProjectsGridCard } from "./sections/ProjectsGridCard";
import { MessageSquare, Pencil, UserCheck, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

import { ActivityFeedContainer } from "@/components/profile/v2/sections/ActivityFeedContainer";
import { useConnectionManager } from "@/hooks/useConnectionManager";
import type { ProfileTabKey, ProfileViewModel } from "./types";
import { Loader2 } from "lucide-react";

// ... (dynamic imports remain same)
const EditProfileModal = dynamic(() => import("@/components/profile/EditProfileModal"), { ssr: false });
const AddSkillModal = dynamic(() => import("@/components/profile/AddSkillModal"), { ssr: false });
const AddExperienceModal = dynamic(() => import("@/components/profile/AddExperienceModal"), { ssr: false });
const AddEducationModal = dynamic(() => import("@/components/profile/AddEducationModal"), { ssr: false });
const ProjectInviteModal = dynamic(() => import("@/components/projects/ProjectInviteModal"), { ssr: false });
const ConnectionsModal = dynamic(() => import("@/components/profile/v2/ConnectionsModal"), { ssr: false });

function computeConversationId(a: string, b: string) {
  return [a, b].sort().join("-");
}


// ... (existing imports)

export default function ProfileV2Client({ viewModel, isAdaptive = false }: { viewModel: ProfileViewModel; isAdaptive?: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [tab, setTab] = useState<ProfileTabKey>("overview");

  // Basic shell state
  const [profile, setProfile] = useState<any>(viewModel.profile);
  const [stats, setStats] = useState(viewModel.stats);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [connectionsModalOpen, setConnectionsModalOpen] = useState(false);
  const [isConnectionLoading, setIsConnectionLoading] = useState(!!viewModel.viewer.connectionPromise);

  const currentUser = viewModel.viewer.currentUser;
  const isOwner = viewModel.viewer.isOwner;
  const isAuthenticated = viewModel.viewer.isAuthenticated;

  // We only use the connection manager for the header buttons/actions in the shell.
  // The counts are updated via callbacks.
  const connectionManager = useConnectionManager(
    viewModel.viewer.connectionStatus,
    currentUser,
    profile,
    isOwner,
    (delta) => setStats((s) => ({ ...s, connectionsCount: (s.connectionsCount || 0) + delta }))
  );

  // Sync basic profile data if it changes (e.g. navigation)
  useEffect(() => {
    setProfile(viewModel.profile);
    setStats(viewModel.stats);
    connectionManager.setConnectionState(viewModel.viewer.connectionStatus);

    // Handle streaming connection status
    if (viewModel.viewer.connectionPromise) {
      setIsConnectionLoading(true);
      Promise.resolve(viewModel.viewer.connectionPromise).then((status) => {
        connectionManager.setConnectionState(status);
        setIsConnectionLoading(false);
      }).catch(err => {
        console.error("Failed to resolve connection status:", err);
        setIsConnectionLoading(false);
      });
    } else {
      setIsConnectionLoading(false);
    }
    // Handle streaming stats
    if (viewModel.statsPromise) {
      Promise.resolve(viewModel.statsPromise).then((newStats) => {
        setStats(newStats);
      }).catch(err => {
        console.error("Failed to resolve stats:", err);
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewModel.profile?.updated_at, viewModel.viewer.connectionStatus, viewModel.viewer.connectionPromise, viewModel.statsPromise]);


  function handleMessage() {
    if (!currentUser || !profile) {
      showToast("Please sign in to message", "info");
      router.push("/login");
      return;
    }
    const conversationId = computeConversationId(currentUser.id, profile.id);
    router.push(`/messages?conversation=${conversationId}&user=${profile.id}`);
  }

  function handleInvite() {
    if (!currentUser || !profile) {
      showToast("Please sign in to invite", "info");
      router.push("/login");
      return;
    }
    setInviteOpen(true);
  }

  function refreshFromServer() {
    router.refresh();
  }

  // Connection UI helpers
  const connectLabel =
    connectionManager.connectionState === "accepted"
      ? "Connected"
      : connectionManager.connectionState === "pending_outgoing"
        ? "Requested"
        : connectionManager.connectionState === "pending_incoming"
          ? "Accept"
          : "Connect";

  const connectIcon =
    connectionManager.connectionState === "accepted" ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />;

  const mobileStickyActions = (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
        {isOwner ? (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Pencil className="w-4 h-4" />
            Edit profile
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={connectionManager.handleConnectPrimary}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                "bg-indigo-600 hover:bg-indigo-700 text-white"
              )}
            >
              {connectIcon}
              {connectLabel}
            </button>
            <button
              type="button"
              onClick={handleMessage}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <MessageSquare className="w-4 h-4" />
              Message
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <ProfileShell
        header={
          <ProfileHeader
            profile={profile}
            isOwner={isOwner}
            isAuthenticated={isAuthenticated}
            connectionState={connectionManager.connectionState}
            onEdit={() => setEditOpen(true)}
            onConnectPrimary={connectionManager.handleConnectPrimary}
            onConnectSecondary={connectionManager.connectionState === "none" ? undefined : connectionManager.handleConnectSecondary}
            onMessage={handleMessage}
            onInvite={handleInvite}
            isAdaptive={isAdaptive}
            isLoadingConnection={isConnectionLoading}
          />
        }
        tabs={<ProfileTabs value={tab} onChange={setTab} />}
        main={
          <React.Suspense fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          }>
            {/* 
                 Inner component that suspends.
                 We pass everything needed.
             */}
            <ProfileContent
              tab={tab}
              viewModel={viewModel}
              isOwner={isOwner} // pass specific derived props to avoid re-deriving
              setProfile={setProfile} // allow updating bio from inside
            />
          </React.Suspense>
        }
        rail={
          <React.Suspense fallback={<div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-3xl animate-pulse" />}>
            <ProfileRightRailWrapper
              viewModel={viewModel}
              stats={stats}
              isOwner={isOwner}
              handleInvite={handleInvite}
              onConnectionsClick={() => setConnectionsModalOpen(true)}
            />
          </React.Suspense>
        }
      />
      {mobileStickyActions}

      {!isOwner && currentUser?.id && profile?.id && inviteOpen ? (
        <ProjectInviteModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          currentUserId={currentUser.id}
          invitee={{
            id: profile.id,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          }}
        />
      ) : null}

      {isOwner && editOpen && (
        <EditProfileModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          profile={profile}
          onSave={() => {
            refreshFromServer();
            showToast("Profile updated", "success");
          }}
        />
      )}

      <ConnectionsModal
        isOpen={connectionsModalOpen}
        onClose={() => setConnectionsModalOpen(false)}
        userId={profile?.id}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Inner Components for Streaming
// --------------------------------------------------------------------------

function ProfileContent({
  tab,
  viewModel,
  isOwner,
  setProfile
}: {
  tab: ProfileTabKey;
  viewModel: ProfileViewModel;
  isOwner: boolean;
  setProfile: (p: any) => void;
}) {
  const { showToast } = useToast();
  const router = useRouter();

  let details: any = {};

  // If we have a promise, unwrap it. Otherwise fall back to data (for legacy/non-streaming calls)
  if (viewModel.detailsPromise) {
    details = use(viewModel.detailsPromise);
  } else if (viewModel.data) {
    details = viewModel.data;
    // If posts are separate in legacy
    details.posts = viewModel.posts;
  }

  // Hydrate state from details
  // Note: In a Suspense world, we ideally just render `details` directly.
  // But if we need mutability (Edit modals), we need state.
  // We initialize state from the fetched details. 
  // Since this component mounts AFTER suspension finishes, initial state is safe.

  const [skills] = useState<any[]>(details.skills || []);
  const [experiences] = useState<any[]>(details.experiences || []);
  const [education] = useState<any[]>(details.education || []);
  const [projects] = useState<any[]>(details.projects || []);

  const posts = details.posts || [];

  // Modals specific to content
  const [skillOpen, setSkillOpen] = useState(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);

  function refresh() {
    router.refresh();
  }

  return (
    <>
      {tab === "overview" ? (
        <div className="space-y-6">
          <AboutCard
            profile={viewModel.profile}
            isOwner={isOwner}
            onBioUpdated={(nextBio) => {
              // Update parent state to reflect immediately in Header if needed (unlikely) or just local context
              setProfile((p: any) => ({ ...(p || {}), bio: nextBio }));
              showToast("Bio updated", "success");
            }}
          />
          <FeaturedProjectsCard projects={projects} isOwner={isOwner} />
          <ExperienceCard experiences={experiences} isOwner={isOwner} onAdd={() => setExperienceOpen(true)} />
          <EducationCard education={education} isOwner={isOwner} onAdd={() => setEducationOpen(true)} />
          <SkillsCard skills={skills} isOwner={isOwner} onAdd={() => setSkillOpen(true)} />
        </div>
      ) : null}

      {tab === "portfolio" ? (
        <div className="space-y-6">
          <FeaturedProjectsCard projects={projects} isOwner={isOwner} />
          <ProjectsGridCard projects={projects} title="All projects" description="Everything you’ve built here on NB." />
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="space-y-6 h-[800px]">
          <ActivityFeedContainer
            initialPosts={posts}
            profile={viewModel.profile}
            currentUser={viewModel.viewer.currentUser}
          />
        </div>
      ) : null}

      {/* Write-mode modals */}
      {isOwner && (
        <>
          {skillOpen && (
            <AddSkillModal
              isOpen={skillOpen}
              onClose={() => setSkillOpen(false)}
              userId={viewModel.profile?.id}
              onSave={() => { refresh(); showToast("Skill saved", "success"); }}
            />
          )}
          {experienceOpen && (
            <AddExperienceModal
              isOpen={experienceOpen}
              onClose={() => setExperienceOpen(false)}
              userId={viewModel.profile?.id}
              onSave={() => { refresh(); showToast("Experience saved", "success"); }}
            />
          )}
          {educationOpen && (
            <AddEducationModal
              isOpen={educationOpen}
              onClose={() => setEducationOpen(false)}
              userId={viewModel.profile?.id}
              onSave={() => { refresh(); showToast("Education saved", "success"); }}
            />
          )}
        </>
      )}
    </>
  );
}

function ProfileRightRailWrapper({
  viewModel,
  stats,
  isOwner,
  handleInvite,
  onConnectionsClick
}: {
  viewModel: ProfileViewModel,
  stats: any,
  isOwner: boolean,
  handleInvite: () => void,
  onConnectionsClick: () => void
}) {
  let details: any = {};
  if (viewModel.detailsPromise) {
    details = use(viewModel.detailsPromise);
  } else if (viewModel.data) {
    details = viewModel.data;
  }

  const socialLinks = details.socialLinks || [];

  return (
    <ProfileRightRail
      profile={viewModel.profile}
      stats={stats}
      isOwner={isOwner}
      socialLinks={socialLinks}
      onInvite={handleInvite}
      onConnectionsClick={onConnectionsClick}
    />
  );
}
