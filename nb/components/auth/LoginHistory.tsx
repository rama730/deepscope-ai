"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { History, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { parseUserAgent } from "@/lib/utils/device";
import type { LoginHistoryEntry } from "@/lib/types/settingsTypes";

type LoginEvent = {
  id: string;
  created_at: string;
  ip_address: string;
  user_agent: string;
  location: string | null;
};

interface LoginHistoryProps {
  initialHistory?: LoginHistoryEntry[];
}

export default function LoginHistory({ initialHistory }: LoginHistoryProps) {
  const [history, setHistory] = useState<LoginEvent[]>(
    initialHistory?.map(h => ({
      id: h.id,
      created_at: h.created_at,
      ip_address: h.ip_address,
      user_agent: h.user_agent,
      location: h.location || null,
    })) || []
  );
  const [loading, setLoading] = useState(!initialHistory);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data, error } = await supabase
          .from('login_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setHistory(data || []);
      } catch (err: any) {
        console.error("Error loading login history:", err.message || err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);



  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin opacity-50" />
        <p>Loading history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-medium text-foreground">Recent Logins</h3>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 border-dashed">
          <p>No login history recorded yet.</p>
          <p className="text-xs mt-1 opacity-70">New logins will appear here.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium">Location & IP</th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((event) => {
                const { browser, os, icon: Icon } = parseUserAgent(event.user_agent);
                return (
                  <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="max-w-[200px]">
                          <div className="font-medium truncate text-foreground">
                            {browser} on {os}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{event.ip_address}</span>
                        {event.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(event.created_at), "MMM d, h:mm a")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

