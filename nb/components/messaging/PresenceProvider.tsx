"use client";

import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@/hooks/useAuth";

/**
 * Provider component that tracks the current user's presence.
 * Should be included in the app layout or messaging context.
 */
export function PresenceProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    usePresence(user?.id);
    
    return <>{children}</>;
}
