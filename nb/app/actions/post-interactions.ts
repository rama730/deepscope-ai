"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";


export async function toggleLikeAction(postId: string, currentStatus: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    if (currentStatus) {
      // User currently likes it -> UNLIKE
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
        
      if (error) throw error;
      return { success: true, liked: false };
    } else {
      // User hasn't liked it -> LIKE
      const { error } = await supabase
        .from("post_likes")
        .upsert(
          { post_id: postId, user_id: user.id },
          { onConflict: "post_id,user_id", ignoreDuplicates: true }
        );
        
      if (error) throw error;
      return { success: true, liked: true };
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    throw new Error("Failed to toggle like");
  }
}

export async function toggleSaveAction(postId: string, currentStatus: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    if (currentStatus) {
      // User currently saved it -> UNSAVE
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("entity_id", postId)
        .eq("user_id", user.id)
        .eq("entity_type", "post");
        
      if (error) throw error;
      return { success: true, saved: false };
    } else {
      // User hasn't saved it -> SAVE
      const { error } = await supabase
        .from("bookmarks")
        .insert({
          entity_id: postId,
          entity_type: "post",
          user_id: user.id
        });
        
      if (error) throw error;
      return { success: true, saved: true };
    }
  } catch (error) {
    console.error("Error toggling save:", error);
    throw new Error("Failed to toggle save");
  }
}

export async function toggleRepostAction(postId: string, currentStatus: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    if (currentStatus) {
      // User currently reposted it -> UNREPOST
      const { error } = await supabase
        .from("post_reposts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
        
      if (error) throw error;
      return { success: true, reposted: false };
    } else {
      // User hasn't reposted it -> REPOST
      const { error } = await supabase
        .from("post_reposts")
        .insert({
          post_id: postId,
          user_id: user.id
        });
        
      if (error) throw error;
      return { success: true, reposted: true };
    }
  } catch (error) {
    console.error("Error toggling repost:", error);
    throw new Error("Failed to toggle repost");
  }
}
