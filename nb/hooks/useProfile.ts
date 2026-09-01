import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Profile } from "@/types/profile";
import { useEffect } from 'react';

export interface UseProfileReturn {
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useProfile(userId: string | null): UseProfileReturn {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const queryKey = ['profile', userId];

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,

  });

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`profile_updates:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            queryClient.setQueryData(queryKey, payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, supabase, queryKey]);

  return {
    profile: profile ?? null,
    isLoading,
    error: error as Error | null,
    reload: refetch,
  };
}
