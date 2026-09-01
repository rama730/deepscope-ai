import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const searchSchema = z.object({
  q: z.string().min(1),
  type: z.enum(["all", "projects", "people", "posts"]).default("all"),
});

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const type = searchParams.get("type") || "all";

  // Validate inputs
  const validation = searchSchema.safeParse({ q, type });
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Invalid search parameters" }, { status: 400 });
  }

  const query = validation.data.q.toLowerCase();
  const searchType = validation.data.type;
  
  const results: any[] = [];
  const limit = 5; // Default limit per category

  try {
    const promises = [];

    // 1. Search People (Profiles)
    if (searchType === "all" || searchType === "people") {
      promises.push(
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, bio, location")
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(limit)
          .then(({ data }) => data?.map(u => ({ ...u, type: "user" })) || [])
      );
    }

    // 2. Search Projects
    if (searchType === "all" || searchType === "projects") {
      promises.push(
        supabase
          .from("projects")
          .select("id, title, description, slug, emoji:title") 
          // Note: emoji is not a column usually, mapped later. 
          // Checking Schema: projects has 'title', 'description', 'slug'.
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(limit)
          .then(({ data }) => data?.map(p => ({ 
              ...p, 
              type: "project", 
              name: p.title,
              // Add mock emoji or logic if exists, for now just generic
              emoji: "📁" 
          })) || [])
      );
    }

    // 3. Search Posts
    if (searchType === "all" || searchType === "posts") {
      promises.push(
        supabase
          .from("posts")
          .select("id, content, user_id, created_at, profiles(username)")
          .ilike("content", `%${query}%`)
          .limit(limit)
          .then(({ data }) => data?.map(p => ({ ...p, type: "post" })) || [])
      );
    }

    // Execute all queries
    const executedResults = await Promise.all(promises);
    executedResults.forEach(group => results.push(...group));

    return NextResponse.json({
      success: true,
      data: results,
      query: q
    });

  } catch (error: any) {
    console.error("Search API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
