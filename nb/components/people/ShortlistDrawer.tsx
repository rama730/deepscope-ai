"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Briefcase, UserPlus, MessageSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { profileHref } from "@/lib/routing/identifiers";
import ProjectInviteModal from "@/components/projects/ProjectInviteModal";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  headline?: string | null;
  location?: string | null;
}

type ConnectionState = "none" | "pending_outgoing" | "pending_incoming" | "accepted";

interface ShortlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shortlistedProfiles: Profile[];
  connectionStates: Record<string, ConnectionState>;
  currentUserId: string | null;
  selectedProjectId: string | null;
  onRemove: (profileId: string) => void;
  onConnect: (profileId: string) => void;
  onAccept: (profileId: string) => void;
  onDecline: (profileId: string) => void;
}

export default function ShortlistDrawer({
  isOpen,
  onClose,
  shortlistedProfiles,
  connectionStates,
  currentUserId,
  selectedProjectId,
  onRemove,
  onConnect,
  onAccept,
  onDecline,
}: ShortlistDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteeProfile, setInviteeProfile] = useState<Profile | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleInviteClick = (profile: Profile) => {
    setInviteeProfile(profile);
    setShowInviteModal(true);
  };

  if (!mounted) return null;

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

            {/* Drawer */}
            {createPortal(
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 z-50 shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Shortlist ({shortlistedProfiles.length})
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                    aria-label="Close shortlist"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {shortlistedProfiles.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📋</div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Your shortlist is empty. Add candidates from Discover to compare them.
                      </p>
                    </div>
                  ) : (
                    shortlistedProfiles.map((profile) => {
                      const connectionState = connectionStates[profile.id] || "none";
                      return (
                        <div
                          key={profile.id}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <Link href={profileHref(profile)} className="flex-shrink-0">
                              {profile.avatar_url ? (
                                <Image
                                  src={profile.avatar_url}
                                  alt={profile.full_name || profile.username || "User"}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                                  {(profile.full_name?.[0] || profile.username?.[0] || "U").toUpperCase()}
                                </div>
                              )}
                            </Link>

                            <div className="flex-1 min-w-0">
                              <Link
                                href={profileHref(profile)}
                                className="block hover:opacity-80 transition-opacity"
                              >
                                <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                  {profile.full_name || profile.username || "User"}
                                </div>
                                {profile.username && (
                                  <div className="text-xs text-zinc-500 truncate">@{profile.username}</div>
                                )}
                                {profile.headline && (
                                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-1">
                                    {profile.headline}
                                  </div>
                                )}
                              </Link>

                              {/* Actions */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {connectionState === "none" && (
                                  <button
                                    onClick={() => onConnect(profile.id)}
                                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
                                  >
                                    <UserPlus className="w-3 h-3" />
                                    Connect
                                  </button>
                                )}
                                {connectionState === "pending_outgoing" && (
                                  <span className="px-2.5 py-1 text-xs rounded-lg border text-zinc-500">
                                    Requested
                                  </span>
                                )}
                                {connectionState === "pending_incoming" && (
                                  <>
                                    <button
                                      onClick={() => onAccept(profile.id)}
                                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => onDecline(profile.id)}
                                      className="px-2.5 py-1 text-xs rounded-lg border hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                      Decline
                                    </button>
                                  </>
                                )}
                                {connectionState === "accepted" && (
                                  <Link
                                    href={`/messages?userId=${profile.id}`}
                                    className="px-2.5 py-1 text-xs font-medium rounded-lg border hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    Message
                                  </Link>
                                )}

                                {selectedProjectId && connectionState !== "none" && (
                                  <button
                                    onClick={() => handleInviteClick(profile)}
                                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                                  >
                                    <Briefcase className="w-3 h-3" />
                                    Invite
                                  </button>
                                )}

                                <button
                                  onClick={() => onRemove(profile.id)}
                                  className="px-2.5 py-1 text-xs rounded-lg border hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>,
              document.body
            )}
          </>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      {currentUserId && inviteeProfile && (
        <ProjectInviteModal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setInviteeProfile(null);
          }}
          currentUserId={currentUserId}
          invitee={{
            id: inviteeProfile.id,
            username: inviteeProfile.username,
            full_name: inviteeProfile.full_name,
            avatar_url: inviteeProfile.avatar_url,
          }}
        />
      )}
    </>
  );
}

