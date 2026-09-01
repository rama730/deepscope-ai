import { Post } from "@/components/explorer/types";

export interface ThreadGroup {
  key: string;
  root: Post;
  replies: Post[];
}

/**
 * Groups posts into conversation threads.
 * 
 * Logic:
 * 1. Visual Root: For any post, find the furthest ancestor present in the feed.
 * 2. Grouping: All posts sharing the same "Visual Root" are grouped.
 * 3. Sorting: Replies are sorted chronologically. Groups are sorted by latest activity.
 */
export function groupThreads(posts: Post[]): ThreadGroup[] {
  // Stage 1: Map all posts by ID for quick lookup
  const postMap = new Map<string, Post>();
  posts.forEach(p => postMap.set(p.id, p));

  // Stage 2: Grouping by Canonical Root (Recursive Ancestry Check)
  // Groups: RootID -> { root: Post | null, replies: Post[], activityTime: number }
  const groups = new Map<string, { root: Post, replies: Post[], activityTime: number }>();

  // Helper to find the "Visual Root" for any given post
  // The Visual Root is the furthest ancestor that is PRESENT in the current feed.
  const findVisualRoot = (startPost: Post): Post => {
    let current = startPost;
    const seen = new Set<string>([current.id]);

    // Traverse up the parent chain
    while (current.parent_post_id && current.parent_post_id !== current.id) {
      if (seen.has(current.parent_post_id)) break; // Cycle protection

      const parent = postMap.get(current.parent_post_id);
      if (parent) {
        current = parent;
        seen.add(current.id);
      } else {
        // Parent not in feed, stop here.
        break;
      }
    }
    return current;
  };

  const assignedPosts = new Set<string>();

  for (const p of posts) {
    if (assignedPosts.has(p.id)) continue;

    // Find the group leader for this post
    const leader = findVisualRoot(p);

    if (!groups.has(leader.id)) {
      groups.set(leader.id, {
        root: leader,
        replies: [],
        activityTime: leader._timestamp || new Date(leader.created_at).getTime()
      });
    }

    const group = groups.get(leader.id)!;

    // Update activity time using cached timestamp
    const timeMs = p._timestamp || new Date(p.created_at).getTime();
    if (timeMs > group.activityTime) {
      group.activityTime = timeMs;
    }

    // If p is not the leader, it's a reply in this group
    if (p.id !== leader.id) {
      // Double check duplicates in replies
      if (!group.replies.some(r => r.id === p.id)) {
        group.replies.push(p);
      }
    }
  }

  // Convert to array
  const resultGroups = Array.from(groups.values());

  // Sort replies within each group chronologically
  resultGroups.forEach(g => {
    g.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

  // Sort groups by latest activity (recent threads at top)
  resultGroups.sort((a, b) => b.activityTime - a.activityTime);

  // Final mapping
  return resultGroups.map(g => ({
    key: `thread:${g.root.id}`,
    root: g.root,
    replies: g.replies
  }));
}
