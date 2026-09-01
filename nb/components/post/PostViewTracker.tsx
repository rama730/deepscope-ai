"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCookieConsent } from "@/components/providers/CookieProvider";

export default function PostViewTracker({ postId, userId }: { postId: string; userId?: string | null }) {
    const supabase = createSupabaseBrowserClient();
    const { preferences } = useCookieConsent();

    useEffect(() => {
        if (!postId || !preferences.analytics) return;
        const recordView = async () => {
            try {
                let sessionId = localStorage.getItem('nb_session_id');
                if (!sessionId) {
                    sessionId = crypto.randomUUID();
                    localStorage.setItem('nb_session_id', sessionId);
                }
                // Fire and forget RPC call
                supabase.rpc('record_post_view', {
                    post_id_param: postId,
                    user_id_param: userId || null,
                    session_id_param: sessionId,
                    source_param: 'post_detail'
                }).then(() => { });
            } catch (err) {
                console.error('Error recording view:', err);
            }
        };
        recordView();
    }, [postId, preferences.analytics]);

    return null;
}
