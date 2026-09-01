import { useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeSubscriptionProps<T extends Record<string, any>> {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string; // e.g., 'id=eq.123'
  onData: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

/**
 * A generic hook to subscribe to Supabase Realtime changes for a specific table.
 * 
 * @deprecated Use `useSubscription` from `@/hooks/useSubscription` instead.
 * This hook creates a new socket connection for every instance, which is inefficient.
 * 
 * @example
 * useRealtimeSubscription({
 *   table: 'messages',
 *   filter: `project_id=eq.${projectId}`,
 *   onData: (payload) => {
 *     console.log('New message:', payload.new);
 *   }
 * });
 */
export function useRealtimeSubscription<T extends Record<string, any>>({
  table,
  schema = 'public',
  event = '*',
  filter,
  onData,
  enabled = true
}: UseRealtimeSubscriptionProps<T>) {
  const supabase = createSupabaseBrowserClient();
  const onDataRef = useRef(onData);

  // Keep callback fresh without re-subscribing
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `public:${table}:${filter || 'all'}:${event}`;
    
    // Create channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          filter,
        } as any,
        (payload: any) => {
          onDataRef.current(payload as RealtimePostgresChangesPayload<T>);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
           // Optional: Debug log
           // console.log(`Subscribed to ${channelName}`);
        }
      });

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, event, filter, enabled, supabase]); // Dependencies that trigger re-subscription
}
