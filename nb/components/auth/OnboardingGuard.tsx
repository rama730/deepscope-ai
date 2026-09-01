"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const checkedRef = useRef(false);

    useEffect(() => {
        if (isLoading || !user || checkedRef.current) return;

        // Skip check for onboarding routes and public api routes that might be caught
        if (pathname.startsWith('/onboarding') || pathname.startsWith('/api/')) return;

        const checkOnboarding = async () => {
            const supabase = createSupabaseBrowserClient();
            const { data: profile } = await supabase
                .from('profiles')
                .select('onboarding_completed')
                .eq('id', user.id)
                .single();

            if (profile && !profile.onboarding_completed) {
                // Double check we aren't already there (race condition)
                if (!window.location.pathname.startsWith('/onboarding')) {
                    router.push('/onboarding');
                }
            }
            checkedRef.current = true;
        };

        checkOnboarding();
    }, [user, isLoading, pathname, router]);

    return <>{children}</>;
}
