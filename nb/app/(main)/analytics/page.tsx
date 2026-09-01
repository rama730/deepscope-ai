import { createSupabaseServerClient } from "@/lib/supabase/server";
import AnalyticsClient from "@/components/analytics/AnalyticsClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Default time range: 30days
  const date = new Date();
  date.setDate(date.getDate() - 30);
  const dateFilter = date.toISOString();

  // Load posts with analytics
  const { data: postsData } = await supabase
    .from("posts")
    .select("id, content, created_at, views_count, likes_count, reposts_count, comments_count, bookmarks_count")
    .eq("user_id", user.id)
    .gte("created_at", dateFilter)
    .order("created_at", { ascending: false });

  // Load profile stats
  const [
    { count: connectionsCount },
    { data: profileData }
  ] = await Promise.all([
    supabase.from("connections").select("*", { count: "exact", head: true }).or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`).eq("status", "accepted"),
    supabase.from("profiles").select("profile_views").eq("id", user.id).single()
  ]);

  const totalImpressions = (postsData || []).reduce((sum, post) => sum + (post.views_count || 0), 0);

  const initialProfileStats = {
    total_followers: 0,
    total_connections: connectionsCount || 0,
    profile_views: profileData?.profile_views || 0,
    post_impressions: totalImpressions,
  };

  return (
    <AnalyticsClient
      initialPosts={postsData || []}
      initialProfileStats={initialProfileStats}
      currentUser={user}
    />
  );
}
