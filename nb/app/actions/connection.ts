'use server';


import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Connection } from "@/types/people";

// Server action


export async function sendConnectionRequest(userId: string, targetId: string) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Enforce that the sender is the authenticated user
  if (userId !== user.id) {
     return { error: "Unauthorized: You can only send requests for yourself." };
  }

  if (!targetId) {
    return { error: "Missing target ID" };
  }

  try {
    // Attempt to call RPC with user's own permissions (RLS should apply)
    const { data, error } = await supabase.rpc("send_connection_request", {
      p_sender_id: user.id, // Use authenticated ID
      p_target_id: targetId,
    });

    if (error) {
      return { error: error.message };
    }

    return data;
  } catch (err: any) {
    console.error("Unexpected error in sendConnectionRequest:", err);
    return { error: err.message || "Unknown error" };
  }
}

export async function getConnections(page: number = 1, limit: number = 20) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: "Unauthorized" };
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const { data, error, count } = await supabase
      .from("connections")
      .select(`
        id,
        user_id,
        connected_user_id,
        accepted_at,
        created_at,
        profiles:user_id(id, username, full_name, avatar_url, bio, location, headline),
        connected_profiles:connected_user_id(id, username, full_name, avatar_url, bio, location, headline)
      `, { count: 'exact' })
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error) throw error;

    // Transform to friendly format
    const connections: Connection[] = (data || []).map((conn: any) => {
       const otherUser = conn.user_id === user.id
          ? conn.connected_profiles
          : conn.profiles;
        
        // Remove nested objects to keep payload smaller and cleaner
        const { profiles, connected_profiles, ...rest } = conn;
        
        return {
          ...rest,
          otherUser,
          // We can keep these for strict type compat if needed, or remove them
          profiles: profiles, 
          connected_profiles: connected_profiles
        };
    });

    return { data: connections, count, error: null };
  } catch (err: any) {
    console.error("Error fetching connections:", err);
    return { data: [], error: err.message };
  }
}
