import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MessagesPageClient } from "@/components/messaging/MessagesPageClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = createSupabaseServerClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-zinc-500">Please log in to view messages.</p>
        </div>
      </div>
    );
  }

  return (
    <MessagesPageClient
      initialUser={user}
    />
  );
}
