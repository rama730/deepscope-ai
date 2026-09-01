import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// GET /api/v1/notifications
// Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data, error } = await supabase
      .from("notifications")
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/v1/notifications
// Create a manual notification (Admin system or special logic)
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // Backward compatibility: support both old (data field) and new payloads
    const { userId, type, title, message, link } = body;

    // Basic validation
    if (!userId || !type || !title) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert notification
    const { data: newNotification, error } = await supabase
        .from("notifications")
        .insert({
            user_id: userId,
            type,
            title,
            message,
            link,
            actor_id: user.id, // The caller is the actor
            related_entity_type: 'manual',
            is_read: false
        })
        .select()
        .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: newNotification });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/v1/notifications
// Mark all as read
export async function PATCH() {
    try {
        const supabase = createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
    
        if (!user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
            
        if (error) throw error;

        return NextResponse.json({ success: true, message: "All notifications marked as read" });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
