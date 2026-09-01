"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthContext } from "./AuthProvider";

export type ConsentType = "all" | "essential" | "none";

interface CookiePreferences {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
}

interface CookieContextType {
    consent: ConsentType;
    preferences: CookiePreferences;
    isLoading: boolean;
    setConsent: (kind: ConsentType) => Promise<void>;
}

const CookieContext = createContext<CookieContextType | undefined>(undefined);

const CONSENT_COOKIE_NAME = "nb-cookie-consent";

export function CookieProvider({ children }: { children: ReactNode }) {
    const { user } = useAuthContext();
    const [consent, setConsentState] = useState<ConsentType>("none");
    const [isLoading, setIsLoading] = useState(true);

    const preferences = {
        essential: true,
        functional: consent === "all" || consent === "essential",
        analytics: consent === "all",
        marketing: false, // We never use marketing trackers as per policy
    };

    const updateConsent = useCallback(async (kind: ConsentType) => {
        setConsentState(kind);
        localStorage.setItem(CONSENT_COOKIE_NAME, kind);

        // Set standard browser cookie for server-side reading
        const maxAge = 60 * 60 * 24 * 365; // 1 year
        document.cookie = `${CONSENT_COOKIE_NAME}=${kind}; path=/; max-age=${maxAge}; SameSite=Lax`;

        try {
            if (user) {
                const supabase = createSupabaseBrowserClient();
                await supabase.from("user_cookie_preferences").upsert({
                    user_id: user.id,
                    essential_cookies: true,
                    functional_cookies: kind === "all" || kind === "essential",
                    analytics_cookies: kind === "all",
                    marketing_cookies: false,
                });
            }
        } catch (err) {
            console.error("Failed to sync cookie preferences to DB:", err);
        }
    }, [user]);

    useEffect(() => {
        async function init() {
            try {
                // 1. Try localStorage
                const local = localStorage.getItem(CONSENT_COOKIE_NAME) as ConsentType;
                if (local) {
                    setConsentState(local);
                }

                // 2. If logged in, prioritize DB
                if (user) {
                    const supabase = createSupabaseBrowserClient();
                    const { data } = await supabase
                        .from("user_cookie_preferences")
                        .select("*")
                        .single();

                    if (data) {
                        const kind: ConsentType = data.analytics_cookies ? "all" : "essential";
                        setConsentState(kind);
                        localStorage.setItem(CONSENT_COOKIE_NAME, kind);
                        // Sync to document.cookie too
                        document.cookie = `${CONSENT_COOKIE_NAME}=${kind}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
                    }
                }
            } catch (err) {
                console.error("Failed to initialize cookie preferences:", err);
            } finally {
                setIsLoading(false);
            }
        }

        init();
    }, [user]);

    return (
        <CookieContext.Provider value={{ consent, preferences, isLoading, setConsent: updateConsent }}>
            {children}
        </CookieContext.Provider>
    );
}

export function useCookieConsent() {
    const context = useContext(CookieContext);
    if (context === undefined) {
        throw new Error("useCookieConsent must be used within a CookieProvider");
    }
    return context;
}
