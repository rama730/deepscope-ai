"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Laptop, Phone, Globe, Trash2, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Session = {
  id: string;
  created_at: string;
  last_seen: string;
  ip: string;
  user_agent: string;
  is_current?: boolean;
};

export default function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call the secure RPC function
      const { data, error } = await supabase.rpc('get_my_sessions');

      if (error) throw error;

      // Get current session to identify which one is active
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession?.access_token) {
        setSessions(data || []);
        return;
      }

      // Extract session ID from JWT token
      // The session ID might be in the JWT payload as 'jti' (JWT ID) or we can match by other criteria
      let currentSessionId: string | null = null;
      try {
        const tokenParts = currentSession.access_token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]!));
          currentSessionId = payload.jti || payload.session_id || null;
        }
      } catch {
        // If we can't decode, we'll use alternative matching
      }

      // Map sessions and identify current one
      const mappedSessions = (data as Session[] || []).map(s => ({
        ...s,
        // Match by session ID if available, otherwise mark first session as current as fallback
        is_current: currentSessionId ? s.id === currentSessionId : false,
      }));

      // If no session was marked as current and we have sessions, mark the first one
      // (This is a fallback - ideally the RPC should return this information)
      if (mappedSessions.length > 0 && !mappedSessions.some(s => s.is_current)) {
        mappedSessions[0]!.is_current = true;
      }

      setSessions(mappedSessions);
    } catch (err: any) {
      setError("Failed to load active sessions.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      const { error } = await supabase.rpc('revoke_my_session', { session_id: sessionId });

      if (error) throw error;

      // Remove from state locally
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      // Error revoking session - show user-friendly message
      alert("Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const parseUserAgent = (ua: string) => {
    if (!ua) return { icon: Globe, name: "Unknown Device" };

    // Simple heuristic parsing
    if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) {
      return { icon: Phone, name: "Mobile Device" };
    }
    return { icon: Laptop, name: "Desktop Computer" };
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-500 animate-pulse">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin opacity-50" />
        <p>Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-4 opacity-50" />
        <p>{error}</p>
        <button onClick={fetchSessions} className="mt-4 text-sm underline hover:text-red-600">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-medium text-foreground">Active Sessions</h3>
      </div>

      {sessions.length === 0 ? (
        <p className="text-zinc-500">No active sessions found.</p>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const { icon: DeviceIcon, name: deviceName } = parseUserAgent(session.user_agent);

            return (
              <div key={session.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <DeviceIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">
                      {deviceName}
                      {/* We'll show the IP as subtitle */}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {session.ip} • Last active {formatDistanceToNow(new Date(session.last_seen), { addSuffix: true })}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1 truncate max-w-[200px] sm:max-w-xs" title={session.user_agent}>
                      {session.user_agent}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {session.is_current && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded">
                      Current
                    </span>
                  )}
                  <button
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id || session.is_current}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={session.is_current ? "Cannot revoke current session" : "Revoke Session"}
                  >
                    {revokingId === session.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
