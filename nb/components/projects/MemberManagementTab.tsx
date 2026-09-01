"use client";

import { useEffect, useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabLoadingScreen } from "@/components/ui-custom/LoadingSkeleton";

interface Member {
  user_id: string;
  role: string | null;
  profiles?: {
    full_name: string | null;
    username: string | null;
  };
  joined_at: string;
  task_count?: number;
  last_active?: string;
}

interface MemberManagementTabProps {
  projectId: string;
  projectCreatorId: string;
  currentUserId: string | null;
  isProjectOwner: boolean;
}

export default function MemberManagementTab({
  projectId,
  isProjectOwner,
}: MemberManagementTabProps) {
  const supabase = createSupabaseBrowserClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (projectId) {
      loadMembers();
      subscribeToMembers();
    }

    return () => {
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
          supabase.removeChannel(channelRef.current);
        } catch (err) {
          console.warn("Error cleaning up members channel:", err);
        }
        channelRef.current = null;
      }
    };
  }, [projectId]);

  async function loadMembers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_collaborators")
      .select(`
        user_id,
        role,
        joined_at,
        profiles(full_name, username)
      `)
      .eq("project_id", projectId)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error loading members:", error);
    } else {
      // Load task counts for each member
      const membersWithStats = await Promise.all(
        (data || []).map(async (member: any) => {
          const { count } = await supabase
            .from("project_tasks")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectId)
            .eq("assigned_to", member.user_id);

          return {
            ...member,
            profiles: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
            task_count: count || 0,
          };
        })
      );
      setMembers(membersWithStats);
    }
    setLoading(false);
  }

  async function subscribeToMembers() {
    // Clean up existing channel if it exists
    if (channelRef.current) {
      try {
        await channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        // Small delay to ensure cleanup completes
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.warn("Error removing existing members channel:", err);
      }
      channelRef.current = null;
    }

    const channelName = `project-${projectId}-members-modal`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_collaborators",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadMembers();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channelRef.current = channel;
        }
      });
  }

  async function handleRemoveMember(userId: string) {
    if (!isProjectOwner || removingId) return;

    if (!confirm("Are you sure you want to remove this member from the project?")) {
      return;
    }

    setRemovingId(userId);

    try {
      const { error } = await supabase
        .from("project_collaborators")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error removing member:", error);
        alert("Failed to remove member");
      } else {
        await loadMembers();
      }
    } catch (err) {
      console.error("Exception removing member:", err);
      alert("An error occurred");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleUpdateRole(userId: string, newRole: string) {
    if (!isProjectOwner || updatingId) return;
    setUpdatingId(userId);

    try {
      const { error } = await supabase
        .from("project_collaborators")
        .update({ role: newRole || null })
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating role:", error);
        alert("Failed to update role");
      } else {
        await loadMembers();
      }
    } catch (err) {
      console.error("Exception updating role:", err);
      alert("An error occurred");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <TabLoadingScreen type="members" />;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{members.length + 1}</div>
          <div className="text-xs text-zinc-500 mt-1">Total Members</div>
        </div>
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{members.filter(m => m.role).length}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">With Roles</div>
        </div>
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {members.reduce((sum, m) => sum + (m.task_count || 0), 0)}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Total Tasks</div>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {/* Project Creator */}
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-lg font-semibold">
                C
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">Project Creator</p>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800">
                    Owner
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">Full project access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Collaborators */}
        {members.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border">
            <svg className="w-20 h-20 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">No team members yet</p>
            <p className="text-sm text-zinc-500">Members will appear here once they join the project.</p>
          </div>
        ) : (
          members.map((member) => (
            <MemberCard
              key={member.user_id}
              member={member}
              isProjectOwner={isProjectOwner}
              onRemove={() => handleRemoveMember(member.user_id)}
              onUpdateRole={(role) => handleUpdateRole(member.user_id, role)}
              removing={removingId === member.user_id}
              updating={updatingId === member.user_id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MemberCard({
  member,
  isProjectOwner,
  onRemove,
  onUpdateRole,
  removing,
  updating,
}: {
  member: Member;
  isProjectOwner: boolean;
  onRemove: () => void;
  onUpdateRole: (role: string) => void;
  removing: boolean;
  updating: boolean;
}) {
  const [roleInput, setRoleInput] = useState(member.role || "");
  const [editingRole, setEditingRole] = useState(false);

  useEffect(() => {
    setRoleInput(member.role || "");
  }, [member.role]);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-lg font-semibold">
            {member.profiles?.full_name?.[0]?.toUpperCase() ||
              member.profiles?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {member.profiles?.full_name || member.profiles?.username || "Unknown User"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {editingRole ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={roleInput}
                    onChange={e => setRoleInput(e.target.value)}
                    className="px-2 py-1 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    placeholder="Role (optional)"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      onUpdateRole(roleInput);
                      setEditingRole(false);
                    }}
                    disabled={updating}
                    className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingRole(false);
                      setRoleInput(member.role || "");
                    }}
                    className="px-2 py-1 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  {member.role ? (
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                      {member.role}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500 italic">No role assigned</span>
                  )}
                  {isProjectOwner && (
                    <button
                      onClick={() => setEditingRole(true)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {member.task_count || 0} tasks
              </span>
              {member.joined_at && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {isProjectOwner && (
          <button
            onClick={onRemove}
            disabled={removing}
            className="px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {removing ? "Removing..." : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
}

