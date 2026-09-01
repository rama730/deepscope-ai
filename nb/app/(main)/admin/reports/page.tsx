import { createSupabaseServerClient } from "@/lib/supabase/server";
import ReportsAdminClient from "@/components/admin/ReportsAdminClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function ReportsAdminPageContent() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-lg border p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-zinc-600 dark:text-zinc-400">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" || profile?.role === "moderator";

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-lg border p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-zinc-600 dark:text-zinc-400">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const { data } = await supabase
    .from("reports")
    .select(`
      id,
      reporter_id,
      reported_user_id,
      post_id,
      project_id,
      reason,
      status,
      created_at
    `)
    .order("created_at", { ascending: false });

  let enrichedReports: any[] = [];

  if (data) {
    // Load related data
    const reporterIds = [...new Set(data.map((r: any) => r.reporter_id))];
    const reportedUserIds = [...new Set(data.map((r: any) => r.reported_user_id).filter(Boolean))];
    const postIds = [...new Set(data.map((r: any) => r.post_id).filter(Boolean))];

    const [
      { data: reporters },
      { data: reportedUsers },
      { data: posts }
    ] = await Promise.all([
      supabase.from("profiles").select("id, full_name, username").in("id", reporterIds),
      reportedUserIds.length > 0
        ? supabase.from("profiles").select("id, full_name, username").in("id", reportedUserIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? supabase.from("posts").select("id, content").in("id", postIds)
        : Promise.resolve({ data: [] })
    ]);

    const reporterMap = new Map((reporters || []).map((r: any) => [r.id, r]));
    const reportedUserMap = new Map((reportedUsers || []).map((r: any) => [r.id, r]));
    const postMap = new Map((posts || []).map((p: any) => [p.id, p]));

    enrichedReports = data.map((report: any) => ({
      ...report,
      reporter: reporterMap.get(report.reporter_id),
      reported_user: report.reported_user_id ? reportedUserMap.get(report.reported_user_id) : null,
      post: report.post_id ? postMap.get(report.post_id) : null
    }));
  }

  return (
    <ReportsAdminClient initialReports={enrichedReports} initialUser={user} isAdmin={isAdmin} />
  );
}

export default function ReportsAdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>}>
      <ReportsAdminPageContent />
    </Suspense>
  );
}
