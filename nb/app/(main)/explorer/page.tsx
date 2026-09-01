import { createSupabaseServerClient } from "@/lib/supabase/server";
import ExplorerClient from "@/components/explorer/ExplorerClient";
import { ExplorerService } from "@/lib/services/explorerService";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ tag?: string; q?: string }> }) {
  const params = await searchParams;
  const title = params.tag ? `Explore #${params.tag}` :
    params.q ? `Explore: ${params.q}` :
      'Explore Feed';

  return {
    title,
    description: 'See what builders are shipping right now.',
    openGraph: {
      title,
      description: 'See what builders are shipping right now.',
    }
  };
}

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  const { tag } = await searchParams;
  const supabase = createSupabaseServerClient();

  // Fetch verified user (Supabase warns that session.user can be insecure on the server)
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // Start fetching posts
  const postsPromise = ExplorerService.getFeed(supabase, { userId, tag })
    .catch(err => {
      console.error("ExplorerPage: Failed to fetch feed", err);
      return [];
    }) as unknown as Promise<any>;

  // Get profile (avoid .single() to prevent 406 spam when a profile row is missing)
  const userPromise = (async () => {
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio, location, website")
      .eq("id", user.id)
      .maybeSingle();

    // Fallback if profile is missing (e.g. after DB reset)
    const effectiveProfile = profile || {
      username: user.user_metadata?.username || "user",
      full_name: user.user_metadata?.full_name || "User",
      avatar_url: user.user_metadata?.avatar_url,
    };
    return { ...user, ...effectiveProfile };
  })();

  // Resolve promises for initial render (RSC)
  const [currentUser, initialPosts] = await Promise.all([
    userPromise,
    postsPromise
  ]);

  return (
    <ExplorerClient
      initialUser={currentUser}
      initialPosts={initialPosts}
    />
  );
}
