import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendConnectionRequest } from "@/app/actions/connection";
import { useToast } from "@/components/ui-custom/Toast";
import type { ConnectionState } from "@/components/profile/v2/types";
import { useRouter } from "next/navigation";

export function useConnectionManager(
  initialState: ConnectionState,
  currentUser: any,
  profile: any,
  isOwner: boolean,
  onConnectionsCountChange?: (delta: number) => void
) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(initialState);
  const { showToast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  async function handleConnectPrimary() {
    if (isOwner) return;
    if (!currentUser || !profile) {
      showToast("Please sign in to connect", "info");
      router.push("/login");
      return;
    }

    const previousState = connectionState;
    try {
      if (connectionState === "none") {
        setConnectionState("pending_outgoing"); // Optimistic update
        const res = await sendConnectionRequest(currentUser.id, profile.id);
        if ((res as any)?.error) throw new Error((res as any)?.error);
        showToast("Connection request sent", "success");
      } else if (connectionState === "pending_incoming") {
        setConnectionState("accepted"); // Optimistic update
        onConnectionsCountChange?.(1);
        
        const { error } = await supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("user_id", profile.id)
          .eq("connected_user_id", currentUser.id)
          .eq("status", "pending");
        if (error) throw error;
        showToast("Connection request accepted", "success");
      }
    } catch (e: any) {
      setConnectionState(previousState); // Rollback
      if (previousState === "pending_incoming") onConnectionsCountChange?.(-1);
      showToast(e?.message || "Failed to update connection", "error");
    }
  }

  async function handleConnectSecondary() {
    if (isOwner) return;
    if (!currentUser || !profile) return;

    const previousState = connectionState;
    try {
      if (connectionState === "pending_outgoing") {
        setConnectionState("none"); // Optimistic
        const { error } = await supabase
          .from("connections")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("connected_user_id", profile.id)
          .eq("status", "pending");
        if (error) throw error;
        showToast("Connection request cancelled", "info");
      } else if (connectionState === "pending_incoming") {
        setConnectionState("none"); // Optimistic
        const { error } = await supabase
          .from("connections")
          .delete()
          .eq("user_id", profile.id)
          .eq("connected_user_id", currentUser.id)
          .eq("status", "pending");
        if (error) throw error;
        showToast("Request declined", "info");
      } else if (connectionState === "accepted") {
        if (!confirm("Disconnect from this user?")) return;
        setConnectionState("none"); // Optimistic
        onConnectionsCountChange?.(-1);
        
        const { error } = await supabase
          .from("connections")
          .delete()
          .or(
            `and(user_id.eq.${currentUser.id},connected_user_id.eq.${profile.id}),and(user_id.eq.${profile.id},connected_user_id.eq.${currentUser.id})`
          );
        if (error) throw error;
        showToast("Disconnected", "success");
      }
    } catch (e: any) {
      setConnectionState(previousState); // Rollback
      if (connectionState === "accepted") onConnectionsCountChange?.(1);
      showToast(e?.message || "Failed to update connection", "error");
    }
  }

  return {
    connectionState,
    setConnectionState,
    handleConnectPrimary,
    handleConnectSecondary
  };
}
