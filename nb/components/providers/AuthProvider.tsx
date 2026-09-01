"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isSignedIn: boolean;
    isLoading: boolean;
    error: Error | null;
    reload: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [supabase] = useState(() => createSupabaseBrowserClient()); // Stable instance

    // Consolidated state to prevent waterfall updates and ensure consistency
    const [state, setState] = useState<{
        user: User | null;
        session: Session | null;
        isLoading: boolean;
        error: Error | null;
    }>({
        user: null,
        session: null,
        isLoading: true, // Start true, implicit check handles it
        error: null,
    });

    const reload = useCallback(async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;

            setState(prev => ({
                ...prev,
                session,
                user: session?.user ?? null,
                error: null
            }));
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Failed to reload user");
            setState(prev => ({ ...prev, error }));
            logger.error("Auth reload error", { error: error.message });
        }
    }, [supabase]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, [supabase]);

    // Initial load & Subscription
    // We rely on onAuthStateChange to fire immediately with the current session (INITIAL_SESSION)
    // allowing us to skip a redundant getSession/getUser call on mount.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setState({
                user: session?.user ?? null,
                session,
                isLoading: false,
                error: null
            });
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    const value = useMemo(() => ({
        user: state.user,
        session: state.session,
        isSignedIn: !!state.user,
        isLoading: state.isLoading,
        error: state.error,
        reload,
        signOut
    }), [state, reload, signOut]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
}
