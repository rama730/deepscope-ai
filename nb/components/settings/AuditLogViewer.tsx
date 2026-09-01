"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Shield, Clock, Globe, Laptop, Smartphone, AlertTriangle, FileText, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type AuditLog = {
    id: string;
    action: string;
    ip_address: string;
    user_agent: string;
    location: string;
    created_at: string;
    meta: any;
};

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            // Fetch logs, ordered by newest first
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setLogs(data || []);
        } catch (err: any) {
            // If table doesn't exist yet, we might get an error.
            // For now, let's just log it and show empty/error state.
            console.error("Error fetching audit logs:", err);
            if (err.code === "42P01") { // undefined_table
                setError("Audit logs are not enabled on this system yet.");
            } else {
                setError("Failed to load activity history.");
            }
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action.toLowerCase()) {
            case 'login': return Shield;
            case 'logout': return Shield;
            case 'password_update': return Shield;
            case 'mfa_enroll': return Smartphone;
            case 'mfa_verify': return Smartphone;
            case 'delete_account': return AlertTriangle;
            default: return Activity;
        }
    };

    const formatAction = (action: string) => {
        // Convert snake_case to Title Case words
        return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const parseUserAgent = (ua: string) => {
        if (!ua) return "Unknown Device";
        if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) return "Mobile Device";
        if (ua.includes("Mac")) return "Mac";
        if (ua.includes("Win")) return "Windows";
        if (ua.includes("Linux")) return "Linux";
        return "Desktop";
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl border-dashed">
                <p className="text-zinc-500">{error}</p>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl border-dashed">
                <FileText className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                <p className="text-zinc-500">No activity recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-medium">Recent Activity</h3>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {logs.map((log) => {
                        const Icon = getActionIcon(log.action);
                        const deviceName = parseUserAgent(log.user_agent);

                        return (
                            <div key={log.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-sm text-foreground">{formatAction(log.action)}</h4>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Globe className="w-3 h-3" />
                                                {log.ip_address || 'Unknown IP'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Laptop className="w-3 h-3" />
                                                {deviceName}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-medium text-foreground">
                                        {new Date(log.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                                        <Clock className="w-3 h-3" />
                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
