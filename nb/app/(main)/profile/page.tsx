import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileDetailsCached } from "@/lib/data/profile";
import ProfileV2Client from "@/components/profile/v2/ProfileV2Client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function ProfilePageContent() {
  const supabase = createSupabaseServerClient();

  // 1. Get Current User and Basic Profile in Parallel
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch basic profile info in parallel to any other checks if possible, 
  // but for "own profile" we know the ID is the user ID.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return <div>Profile not found</div>
  }

  // 2. Start fetching heavy details (Non-blocking)
  const detailsPromise = getProfileDetailsCached(user.id);

  const headersList = await headers();
  const isAdaptive = headersList.get("x-adaptive-loading") === "true";

  // Stats - Streaming (Non-blocking)
  const statsPromise = (async () => {
    // 1. Connections Count
    const { count: connectionsCount } = await supabase
      .from("connections")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`user_id.eq.${profile.id},connected_user_id.eq.${profile.id}`);

    // 2. Projects Count (optional, if we want to stream it too, or keep 0 if handled elsewhere)
    // For now, let's just get connections as requested.
    // We can also fetch projects count if needed.
    const { count: projectsCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", profile.id);

    return {
      connectionsCount: connectionsCount || 0,
      projectsCount: projectsCount || 0,
      followersCount: 0, // Not implemented yet
    };
  })();

  return (
    <ProfileV2Client
      isAdaptive={isAdaptive}
      viewModel={{
        profile,
        stats: {
          connectionsCount: 0,
          projectsCount: 0,
          followersCount: 0,
        },
        statsPromise,
        detailsPromise,
        viewer: {
          currentUser: user,
          isAuthenticated: true,
          isOwner: true,
          connectionStatus: "none", // Own profile doesn't have connection status to self, technically "none" or could be ignored by client
        },
      }}
    />
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>}>
      <ProfilePageContent />
    </Suspense>
  );
}
