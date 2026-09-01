"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";

export async function reorderSkillsAction(items: { id: string; order: number }[]) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase.rpc("update_skills_order", {
    p_items: items,
  });

  if (error) {
    return { error: error.message };
  }

  // @ts-expect-error - Next.js 16 beta signature mismatch
  revalidateTag(`profile:${user.id}`);
  return { success: true };
}
