import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export function useRealtimeRouterSubscription<T extends Record<string, any>>(opts: {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string;
  enabled?: boolean;
  onData: (payload: RealtimePostgresChangesPayload<T>) => void;
}) {
  const onDataRef = useRef(opts.onData);

  useEffect(() => {
    onDataRef.current = opts.onData;
  }, [opts.onData]);

  useEffect(() => {
    if (opts.enabled === false) return;

    const supabase = createSupabaseBrowserClient();
    const channelName = `sub-${opts.table}-${opts.event || '*'}-${opts.filter || 'all'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any, // Cast to any to bypass strict literal type mismatch if needed, or check types
        {
          event: opts.event || '*',
          schema: opts.schema || 'public',
          table: opts.table,
          filter: opts.filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => onDataRef.current(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [opts.table, opts.schema, opts.event, opts.filter, opts.enabled]);
}


