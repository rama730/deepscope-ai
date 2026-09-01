"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatus() {
    const [status, setStatus] = useState<"CONNECTED" | "DISCONNECTED" | "CONNECTING">("CONNECTING");
    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        // Supabase Realtime socket state monitoring
        // The channel 'realtime' is the default one, but we can monitor the socket directly usually via the client internals
        // or by creating a dummy channel to track connection.

        const channel = supabase.channel('system_status');

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                setStatus("CONNECTED");
            } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
                setStatus("DISCONNECTED");
            } else {
                setStatus("CONNECTING");
            }
        });

        // In a more advanced setup, we'd hook into the socket's onOpen/onClose
        // But channel subscription status is a good proxy for "Can I receive updates?"

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    if (status === "CONNECTED") return null; // Auto-hide when good

    return (
        <div className={`fixed bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg transition-all duration-500 ${status === "DISCONNECTED"
                ? "bg-red-500 text-white"
                : "bg-amber-500 text-white"
            }`}>
            {status === "DISCONNECTED" ? <WifiOff size={14} /> : <Wifi size={14} className="animate-pulse" />}
            {status === "DISCONNECTED" ? "Offline" : "Reconnecting..."}
        </div>
    );
}
