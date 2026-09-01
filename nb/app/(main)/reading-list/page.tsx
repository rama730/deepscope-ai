import { createSupabaseServerClient } from "@/lib/supabase/server";
import ExplorerClient from "@/components/explorer/ExplorerClient";
import { redirect } from "next/navigation";

export default async function ReadingListPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch initial bookmarked posts
  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("entity_id")
    .eq("user_id", user.id)
    .eq("entity_type", "post")
    .order("created_at", { ascending: false })
    .limit(20);

  const postIds = bookmarks?.map((b) => b.entity_id) || [];
  let initialPosts: any[] = [];

  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        created_at,
        user_id,
        likes_count,
        comments_count,
        reposts_count,
        bookmarks_count,
        views_count,
        edited_at,
        reply_count,
        post_type,
        project_id,
        project_update_id,
        project_idea_id,
        media,
        poll_data,
        collaboration_data,
        achievement_data,
        cta,
        tags,
        parent_post_id,
        thread_root_id,
        is_reply,
        quoted_post_id,
        is_quote,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        ),
        parent_post:parent_post_id (
          user_id,
          profiles:user_id (
            username,
            full_name
          )
        ),
        quoted_post:quoted_post_id (
          id,
          content,
          created_at,
          user_id,
          media,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        ),
        project:project_id (
          id,
          title,
          status,
          project_type,
          custom_project_type
        )
      `)
      .in("id", postIds);

    // Sort to match bookmark order
    if (posts) {
      const postMap = new Map(posts.map(p => [p.id, p]));
      initialPosts = postIds.map(id => postMap.get(id)).filter(Boolean);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto flex justify-center">
        <main className="w-full max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen">
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <h1 className="text-xl font-bold">Reading List</h1>
          </div>
          <ExplorerClient
            initialPosts={initialPosts}
            initialUser={user}
            feedType="saved"
          />
        </main>
      </div>
    </div>
  );
}
