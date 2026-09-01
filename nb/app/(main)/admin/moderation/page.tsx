import { createSupabaseServerClient } from "@/lib/supabase/server";
import ModerationClient from "@/components/admin/ModerationClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function ModerationPageContent() {
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("reports")
    .select(`id, reason, status, created_at, posts(id, content, user_id), reporter:profiles!reports_reporter_id_fkey(id, username, full_name)`);

  const reports = (data as any[]) || [];

  return (
    <ModerationClient initialReports={reports} />
  );
}

export default function ModerationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>}>
      <ModerationPageContent />
    </Suspense>
  );
}