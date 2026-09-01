import { createServerClient } from "@supabase/ssr";
import { unstable_cache } from "next/cache";

export async function getProfileDetailsCached(userId: string) {
  const getDetails = unstable_cache(
    async (id: string) => {
      // Create a specific client for caching that doesn't rely on request cookies
      // This is crucial for ISR/unstable_cache where request context might be missing
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return [] },
            setAll() {} 
          }
        }
      );

      const { data, error } = await supabase.rpc("get_profile_details", { p_user_id: id });
      
      if (error) {
        console.error("RPC Error in getProfileDetailsCached:", error);
        throw error;
      }
      return data;
    },
    ["profile-details"],
    {
      tags: [`profile:${userId}`],
      revalidate: 3600,
    }
  );

  try {
    return await getDetails(userId);
  } catch (error) {
    console.error("Error fetching cached profile details:", error);
    return null;
  }
}
