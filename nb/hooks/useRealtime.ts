import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

/**
 * Options for configuring real-time subscriptions
 */
interface UseRealtimeOptions<T extends Record<string, any>> {
    table: string;
    schema?: string;
    event?: "INSERT" | "UPDATE" | "DELETE" | "*";
    filter?: string;
    onInsert?: (payload: T) => void;
    onUpdate?: (payload: T) => void;
    onDelete?: (payload: T) => void;
    onPostgresChanges?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

/**
 * Hook to subscribe to real-time database changes
 * 
 * @deprecated Use `useSubscription` from `@/hooks/useSubscription` instead.
 * This hook creates a new socket connection for every instance, which is inefficient.
 * 
 * Uses refs for callbacks to prevent unnecessary re-subscriptions and memory leaks
 * 
 * @param options - Configuration object with table, schema, event, filter, and callbacks
 * @example
 * ```tsx
 * useRealtime({
 *   table: 'messages',
 *   event: 'INSERT',
 *   onInsert: (newMessage) => console.log('New message:', newMessage)
 * });
 * ```
 */
export function useRealtime<T extends Record<string, any>>({
    table,
    schema = "public",
    event = "*",
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onPostgresChanges,
}: UseRealtimeOptions<T>) {
    const supabase = createSupabaseBrowserClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    
    // Use refs for callbacks to avoid re-subscriptions
    const onInsertRef = useRef(onInsert);
    const onUpdateRef = useRef(onUpdate);
    const onDeleteRef = useRef(onDelete);
    const onPostgresChangesRef = useRef(onPostgresChanges);

    // Update refs when callbacks change
    useEffect(() => {
        onInsertRef.current = onInsert;
        onUpdateRef.current = onUpdate;
        onDeleteRef.current = onDelete;
        onPostgresChangesRef.current = onPostgresChanges;
    }, [onInsert, onUpdate, onDelete, onPostgresChanges]);

    useEffect(() => {
        // Create a unique channel name based on params
        const channelName = `db-changes:${schema}:${table}:${filter || "all"}`;

        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: event as "INSERT" | "UPDATE" | "DELETE" | "*",
                    schema: schema,
                    table: table,
                    filter: filter,
                } as any,
                (payload: RealtimePostgresChangesPayload<T>) => {
                    try {
                        if (onPostgresChangesRef.current) {
                            onPostgresChangesRef.current(payload);
                        }

                        if (payload.eventType === "INSERT" && onInsertRef.current) {
                            onInsertRef.current(payload.new as T);
                        }
                        if (payload.eventType === "UPDATE" && onUpdateRef.current) {
                            onUpdateRef.current(payload.new as T);
                        }
                        if (payload.eventType === "DELETE" && onDeleteRef.current) {
                            onDeleteRef.current(payload.old as T);
                        }
                    } catch (err) {
                        logger.error("Error in realtime callback", {
                            table,
                            eventType: payload.eventType,
                            error: err instanceof Error ? err.message : String(err)
                        });
                    }
                }
            )
            .subscribe((status) => {
                if (status === "CHANNEL_ERROR") {
                    logger.warn("Realtime subscription error", { table, schema, filter });
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [supabase, table, schema, event, filter]); // Removed callbacks from deps
}
