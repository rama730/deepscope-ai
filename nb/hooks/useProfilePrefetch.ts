import { useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/config/query-config";
import { profileKeys } from "@/lib/queryKeys";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useProfilePrefetch() {
  const queryClient = useQueryClient();
  const supabase = createSupabaseBrowserClient();

  const prefetchProfile = (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: profileKeys.detail(userId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) throw error;
        return data;
      },
      staleTime: STALE_TIMES.SHORT,
    });
  };

  return { prefetchProfile };
}
