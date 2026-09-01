import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { STALE_TIMES } from "@/lib/config/query-config";

export function useProfileStats(userId: string | undefined) {
  const supabase = createSupabaseBrowserClient();

  return useQuery({
    queryKey: ["rail", "stats", userId],
    queryFn: async () => {
      if (!userId) return null;

      const [
        { count: projects },
        { count: collaborations },
        { count: pending },
        { count: saved },
        { count: skills },
        { count: tools },
        { count: techniques },
        { count: passkeys },
        { count: accepted }
      ] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("creator_id", userId),
        supabase.from("project_collaborators").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("connections").select("*", { count: "exact", head: true }).eq("connected_user_id", userId).eq("status", "pending"),
        supabase.from("bookmarks").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("skills").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("user_tools").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("user_techniques").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("passkey_credentials").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("connections").select("*", { count: "exact", head: true }).or(`user_id.eq.${userId},connected_user_id.eq.${userId}`).eq("status", "accepted"),
      ]);

      return {
        counts: {
          projects: (projects || 0) + (collaborations || 0),
          pending: pending || 0,
          saved: saved || 0,
          connections: accepted || 0
        },
        onboarding: {
          hasInterests: (skills || 0) + (tools || 0) + (techniques || 0) > 0,
          hasSecurity: (passkeys || 0) > 0,
          hasConnections: (accepted || 0) > 0 || (pending || 0) > 0
        }
      };
    },
    enabled: !!userId,
    staleTime: STALE_TIMES.SHORT,
  });
}

export function useOnboardingStatus(userId: string | undefined) {
  const supabase = createSupabaseBrowserClient();

  return useQuery({
    queryKey: ["rail", "onboarding", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed, onboarding_step, username, avatar_url")
        .eq("id", userId)
        .maybeSingle();
        
      return data;
    },
    enabled: !!userId,
    staleTime: STALE_TIMES.STANDARD,
  });
}
