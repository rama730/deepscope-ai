"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useConnectionStore } from "@/stores/useConnectionStore";

interface UsePeopleNotificationsReturn {
  pendingConnectionCount: number;
  pendingInviteCount: number;
  totalPending: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function usePeopleNotifications(): UsePeopleNotificationsReturn {
  const { user } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  // Use the new store
  const { 
    pendingIncomingCount, 
    initialize, 
    isLoading: isStoreLoading 
  } = useConnectionStore();
  
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [isInviteLoading, setIsInviteLoading] = useState(true);

  // Initialize central store on mount/user change
  useEffect(() => {
    if (user?.id) {
       initialize(user.id);
    }
  }, [user?.id, initialize]);

  // Parallel fetch for INVITES (since Connections are handled by store)
  const fetchInviteCounts = useCallback(async () => {
    if (!user?.id) {
      setPendingInviteCount(0);
      setIsInviteLoading(false);
      return;
    }

    try {
      let inviteCount = 0;
      const { count, error } = await supabase
          .from("project_invitations")
          .select("*", { count: "exact", head: true })
          .eq("invitee_id", user.id)
          .eq("status", "pending");
      
      if (!error) inviteCount = count || 0;
      setPendingInviteCount(inviteCount);
    } catch (e) {
      console.warn("Failed to fetch invite count", e);
    } finally {
      setIsInviteLoading(false);
    }
  }, [user?.id, supabase]);

  // Initial fetch for invites
  useEffect(() => {
    fetchInviteCounts();
  }, [fetchInviteCounts]);

  // Real-time subscription ONLY for INVITES (Connections handled by store)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("people-notifications-invites")
      // Project Invitations
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_invitations",
          filter: `invitee_id=eq.${user.id}`,
        },
        async (payload) => {
           if (payload.eventType === "INSERT") {
             // Fetch project and inviter details
             const { data: project } = await supabase
               .from("projects")
               .select("title")
               .eq("id", payload.new.project_id)
               .single();
             
             const { data: inviter } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("id", payload.new.inviter_id)
                .single();

             const inviterName = inviter?.full_name || inviter?.username || "Someone";
             const projectTitle = project?.title || "a project";
             
             toast.info(`${inviterName} invited you to join ${projectTitle}`, {
               action: {
                 label: "View",
                 onClick: () => router.push("/people?tab=inbox")
               }
             });
           }
           fetchInviteCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, fetchInviteCounts, router]);

  const isLoading = isStoreLoading || isInviteLoading;

  return {
    pendingConnectionCount: pendingIncomingCount,
    pendingInviteCount,
    totalPending: pendingIncomingCount + pendingInviteCount,
    isLoading,
    refresh: async () => {
       await Promise.all([
          fetchInviteCounts(),
          user?.id ? initialize(user.id) : Promise.resolve() 
       ]);
    }
  };
}
