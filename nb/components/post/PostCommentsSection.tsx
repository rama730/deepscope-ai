import { createSupabaseServerClient } from "@/lib/supabase/server";
import PostCommentList from "./PostCommentList";
import { Post } from "@/components/explorer/types";

interface PostCommentsSectionProps {
    postId: string;
    currentUser: any;
    threadRootId?: string;
}

export default async function PostCommentsSection({ postId, currentUser, threadRootId }: PostCommentsSectionProps) {
    const supabase = createSupabaseServerClient();

    // Load comments (replies)
    let commentsData: Post[] = [];
    let parentPost: Post | null = null;

    // Parallel fetch for comments and maybe parent post info if needed
    // The query logic mimics the original page.tsx
    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`
            *,
            profiles:user_id (
            username,
            full_name,
            avatar_url
            ),
            media, poll_data, collaboration_data, achievement_data
        `)
            // Optimized query: fetch all comments in the thread to build the tree client-side
            // OR just fetch direct replies? The client uses `repliesByParentId` so it expects the whole tree or at least a chunk.
            // We'll stick to fetching the thread associated with this ID.
            // If this post IS a reply, we might want to fetch its siblings? 
            // For now, let's fetch children of this post primarily.
            .or(`thread_root_id.eq.${postId},parent_post_id.eq.${postId}`)
            .eq('is_reply', true)
            .order('created_at', { ascending: true });

        if (!error && data) {
            commentsData = data as any[];
        }

        // Check if we need parent post info (if this post is a reply itself)
        // Actually, the original code looked up `parent_post_id` from the main `post` object.
        // We can pass that down if we have it, or fetch it here.
        // For efficiency, let's assume the main page might have passed it or we fetch it if we really need "Replying to" context.
        // But for "Comments on THIS post", we mainly care about children.
        // The "Replying to" header usually appears if I am viewing a reply and want to see what it's replying TO.
        // Let's Skip parentPost fetch here for now unless critical.

    } catch (e) {
        console.error("Error loading comments:", e);
    }

    return (
        <PostCommentList
            postId={postId}
            initialComments={commentsData}
            currentUser={currentUser}
            threadRootId={threadRootId}
            parentPost={parentPost}
        />
    );
}
