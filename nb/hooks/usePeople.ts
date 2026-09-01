"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { peopleKeys } from "@/lib/queryKeys";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/api-error";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
  skills: { skill_name: string }[];
  created_projects: { id: string; title: string; technologies_used: string[] }[];
  connection_status: "none" | "pending" | "accepted";
}

export interface UsePeopleProps {
  initialUser?: any;
  searchQuery?: string;
  locations?: string[];
  skills?: string[];
  projectTags?: string[];
}

export function usePeople({ 
  initialUser, 
  searchQuery = "", 
  locations = [], 
  skills = [], 
  projectTags = [] 
}: UsePeopleProps) {
  const supabase = createSupabaseBrowserClient();

  // When the viewer is not logged in, the RPC's `p.id <> p_user_id` check would filter out all rows if p_user_id is NULL.
  // Use a sentinel UUID so anonymous viewers still see people, and connection_status naturally defaults to "none".
  const viewerUserId: string = initialUser?.id || "00000000-0000-0000-0000-000000000000";

  // We assume the searchQuery passed in is already what we want to fetch (e.g. from URL).
  // If we need debouncing, it should happen before updating the URL/prop.
  // However, specifically for "typing" into a box, we might want local state.
  // But generally for "Tab Switching", the state is already in the URL.
  
  const fetchPeople = async ({ pageParam = null }: { pageParam?: string | null }) => {
    // Primary path: fast RPC (server-side filtering + aggregation)
    const { data, error } = await supabase.rpc("get_people_v2", {
      p_user_id: viewerUserId,
      p_limit: 20,
      p_cursor: pageParam,
      p_search_query: searchQuery || null,
      p_location_filter: locations.length > 0 ? locations : null,
      p_skills_filter: skills.length > 0 ? skills : null,
      p_project_tags_filter: projectTags.length > 0 ? projectTags : null,
    });

    if (!error) {
      return (data as Profile[]) || [];
    }

    // Fallback path: basic `profiles` query (keeps UI usable if RPC isn't deployed/available).
    // Note: this fallback intentionally returns empty `skills` / `created_projects` arrays; PersonCard loads details lazily.
    try {
      let q = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, location, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (initialUser?.id) {
        q = q.neq("id", initialUser.id);
      }
      if (pageParam) {
        q = q.lt("created_at", pageParam);
      }
      if (searchQuery && searchQuery.trim()) {
        const s = searchQuery.trim();
        // Broad match across key text fields
        q = q.or(`full_name.ilike.%${s}%,username.ilike.%${s}%,bio.ilike.%${s}%,location.ilike.%${s}%`);
      }
      if (locations.length > 0) {
        q = q.in("location", locations);
      }

      const fallbackRes = await q;
      if (fallbackRes.error) {
        const primaryMsg = getErrorMessage(error);
        const fallbackMsg = getErrorMessage(fallbackRes.error);
        throw new Error(`People query failed (rpc: ${primaryMsg}; fallback: ${fallbackMsg})`);
      }

      return ((fallbackRes.data || []) as any[]).map((p) => ({
        ...p,
        skills: [],
        created_projects: [],
        connection_status: "none",
      })) as Profile[];
    } catch (e) {
      // Re-throw as a real Error so the global query handler has a message/stack (instead of `{}`)
      const primaryMsg = getErrorMessage(error);
      const fallbackMsg = getErrorMessage(e);
      throw new Error(`People query failed: ${primaryMsg}${fallbackMsg ? ` (fallback: ${fallbackMsg})` : ""}`);
    }
  };

  const queryKey = peopleKeys.list({ searchQuery, locations, skills, projectTags });

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,

  } = useInfiniteQuery({
    queryKey,
    queryFn: fetchPeople,
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 20) return null;
      return lastPage[lastPage.length - 1]?.created_at;
    },

    // @ts-ignore - keepPreviousData is valid in v5 but might be different import or placeholderData function
    placeholderData: (previousData: any) => previousData,
    enabled: true, // Always allow fetching if mounted
  });

  const profiles = data ? data.pages.flatMap((p) => p) : [];

  return {
    profiles,
    loading: isFetching && !isFetchingNextPage,
    loadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    loadMore: fetchNextPage,
    error,
  };
}
