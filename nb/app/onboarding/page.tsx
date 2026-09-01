import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; step?: string }>;
}) {
    const supabase = createSupabaseServerClient();
    const params = await searchParams;
    const fromExplorer = params?.from === "explorer";

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check if already onboarded
    let { data: profile } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, date_of_birth, location, location_city, location_region, location_country, location_source, onboarding_completed, onboarding_step")
        .eq("id", user.id)
        .maybeSingle();

    // Ensure a profile row exists (protect against DB resets / trigger races)
    if (!profile) {
        await supabase
            .from("profiles")
            .upsert({
                id: user.id,
                username: user.user_metadata?.username || null,
                full_name: user.user_metadata?.full_name || null,
                avatar_url: user.user_metadata?.avatar_url || null,
                onboarding_completed: false,
                onboarding_step: "profile",
                updated_at: new Date().toISOString(),
            });

        const res = await supabase
            .from("profiles")
            .select("id, username, avatar_url, bio, date_of_birth, location, location_city, location_region, location_country, location_source, onboarding_completed, onboarding_step")
            .eq("id", user.id)
            .maybeSingle();
        profile = res.data || null;
    }

    // If onboarding was already completed, allow opening this page only when launched from Explorer,
    // so users can finish skipped (optional) onboarding items.
    if (profile?.onboarding_completed && !fromExplorer) {
        redirect("/explorer");
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4">
            <OnboardingWizard user={user} initialProfile={profile || null} />
        </div>
    );
}
