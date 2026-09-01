"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";


export interface ProjectPresenceMember {
    user_id: string;
    last_seen_at: string;
    last_activity_at: string;
    is_active: boolean;
    is_typing: boolean;
    activity_type: 'active' | 'typing' | 'idle' | 'away';
    profile?: {
        full_name?: string;
        username?: string;
        avatar_url?: string;
    };
}

export interface UseProjectPresenceReturn {
    members: ProjectPresenceMember[];
    onlineCount: number;
    activeCount: number;
    typingUsers: string[];
    isLoading: boolean;
    updatePresence: (isTyping?: boolean, activityType?: 'active' | 'typing' | 'idle' | 'away') => Promise<void>;
}

export function useProjectPresence(projectId: string | null): UseProjectPresenceReturn {
    const [members, setMembers] = useState<ProjectPresenceMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createSupabaseBrowserClient();

    const loadPresence = useCallback(async () => {
        if (!projectId) {
            setIsLoading(false);
            return;
        }

        try {
            // Try to select only basic columns first (in case new columns don't exist yet)
            const { data: simpleData, error: simpleError } = await supabase
                .from('project_presence')
                .select('user_id, last_seen_at, is_active')
                .eq('project_id', projectId)
                .order('last_seen_at', { ascending: false });

            if (simpleError) {
                // Only log if there's actual error information
                // Common causes: RLS blocking access, table doesn't exist, or user not a member
                const hasErrorInfo = simpleError.message || simpleError.code || simpleError.details || simpleError.hint;
                if (hasErrorInfo) {
                    console.warn("Could not load project presence:", {
                        message: simpleError.message,
                        code: simpleError.code,
                        details: simpleError.details,
                        hint: simpleError.hint
                    });
                }
                // Silently fail - this is expected if user doesn't have access or table doesn't exist
                setMembers([]);
                setIsLoading(false);
                return;
            }

            // If no data, just return empty array (this is not an error)
            if (!simpleData || simpleData.length === 0) {
                setMembers([]);
                setIsLoading(false);
                return;
            }

            // Try to get additional columns if they exist
            const { data: extendedData } = await supabase
                .from('project_presence')
                .select('user_id, last_activity_at, is_typing, activity_type')
                .eq('project_id', projectId);

            // Merge extended data if available
            const extendedMap = new Map();
            if (extendedData) {
                extendedData.forEach((item: any) => {
                    extendedMap.set(item.user_id, item);
                });
            }

            // Load profiles separately
            const userIds = simpleData.map((p: any) => p.user_id).filter(Boolean);
            let profilesMap = new Map();
            
            if (userIds.length > 0) {
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, avatar_url')
                    .in('id', userIds);

                if (profilesData) {
                    profilesMap = new Map(profilesData.map((p: any) => [p.id, p]));
                }
            }

            const formattedMembers: ProjectPresenceMember[] = simpleData.map((p: any) => {
                const extended = extendedMap.get(p.user_id);
                const profile = profilesMap.get(p.user_id);
                return {
                    user_id: p.user_id,
                    last_seen_at: p.last_seen_at || new Date().toISOString(),
                    last_activity_at: extended?.last_activity_at || p.last_seen_at || new Date().toISOString(),
                    is_active: p.is_active ?? true,
                    is_typing: extended?.is_typing || false,
                    activity_type: extended?.activity_type || 'active',
                    profile: profile ? {
                        full_name: profile.full_name,
                        username: profile.username,
                        avatar_url: profile.avatar_url
                    } : undefined
                };
            });

            setMembers(formattedMembers);
            setIsLoading(false);
        } catch (error) {
            console.error("Error loading project presence (catch block):", error instanceof Error ? error.message : String(error));
            setMembers([]);
            setIsLoading(false);
        }
    }, [projectId, supabase]);

    const updatePresence = useCallback(async (
        isTyping: boolean = false,
        activityType: 'active' | 'typing' | 'idle' | 'away' = 'active'
    ) => {
        if (!projectId) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.rpc('update_project_presence', {
                p_project_id: projectId,
                p_user_id: user.id,
                p_is_typing: isTyping,
                p_activity_type: activityType
            });
        } catch (error) {
            console.error("Error updating project presence:", error);
        }
    }, [projectId, supabase]);

    // Load initial presence
    useEffect(() => {
        loadPresence();
    }, [loadPresence]);

    // Subscribe to real-time presence updates using unified hook
    useSubscription({
        table: 'project_presence',
        schema: 'public',
        filter: `project_id=eq.${projectId}`,
        event: '*', 
        enabled: !!projectId,
        onData: () => {
             // Reload presence when changes occur
             loadPresence();
        }
    });

    // Update presence periodically to mark as active
    useEffect(() => {
        if (!projectId) return;

        const interval = setInterval(() => {
            updatePresence(false, 'active');
        }, 30000); // Every 30 seconds

        return () => {
            clearInterval(interval);
        };
    }, [projectId, updatePresence]);

    const onlineCount = members.filter(m => m.is_active).length;
    const activeCount = members.filter(m => 
        m.is_active && 
        m.activity_type === 'active' && 
        new Date(m.last_activity_at).getTime() > Date.now() - 5 * 60 * 1000 // Active in last 5 minutes
    ).length;
    const typingUsers = members.filter(m => m.is_typing).map(m => m.user_id);

    return {
        members,
        onlineCount,
        activeCount,
        typingUsers,
        isLoading,
        updatePresence
    };
}
