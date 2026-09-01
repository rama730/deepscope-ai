import { createSupabaseServerClient } from "@/lib/supabase/server";
import ListsClient from "@/components/lists/ListsClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function ListsPageContent() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let lists: any[] = [];

  if (user) {
    const { data } = await supabase
      .from("lists")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      lists = await Promise.all(
        data.map(async (list) => {
          const { count } = await supabase
            .from("list_members")
            .select("*", { count: "exact", head: true })
            .eq("list_id", list.id);

          return { ...list, member_count: count || 0 };
        })
      );
    }
  }

  return (
    <ListsClient initialLists={lists} initialUser={user} />
  );
}

export default function ListsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>}>
      <ListsPageContent />
    </Suspense>
  );
}
