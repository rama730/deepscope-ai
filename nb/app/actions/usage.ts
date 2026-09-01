"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UsageStats {
    used: number; // bytes
    limit: number; // bytes
    percentage: number;
    periodEnd: string | null;
}

const DEFAULT_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB

/**
 * Fetches the current user's egress bandwidth usage.
 */
export async function getEgressUsage(): Promise<{ data: UsageStats | null; error: string | null }> {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { data: null, error: "Unauthorized" };
    }

    try {
        const { data, error } = await supabase
            .from("user_usage_quotas")
            .select("*")
            .eq("user_id", user.id)
            .eq("resource_type", "egress_bandwidth")
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
             throw error;
        }

        // If no record exists, they have 0 usage. Return default structure.
        if (!data) {
            return {
                data: {
                    used: 0,
                    limit: DEFAULT_LIMIT,
                    percentage: 0,
                    periodEnd: null
                },
                error: null
            };
        }

        const used = Number(data.used_amount || 0);
        const limit = Number(data.limit_amount || DEFAULT_LIMIT);
        const percentage = Math.min((used / limit) * 100, 100);

        return {
            data: {
                used,
                limit,
                percentage,
                periodEnd: data.period_end
            },
            error: null
        };

    } catch (error: any) {
        console.error("Error fetching usage:", error);
        return { data: null, error: "Failed to fetch usage stats" };
    }
}

/**
 * Resets the user's egress usage to 0.
 * Includes a basic rate limit check (via timestamp logic or just allowing it for now).
 */
export async function resetEgressUsage(): Promise<{ success: boolean; error: string | null }> {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Upsert logic: if row exists, set used=0. If not, create one with used=0.
        const { error } = await supabase
            .from("user_usage_quotas")
            .upsert({
                user_id: user.id,
                resource_type: "egress_bandwidth",
                used_amount: 0,
                limit_amount: DEFAULT_LIMIT, // Ensure limit is set/preserved
                last_updated: new Date().toISOString()
            }, {
                onConflict: "user_id, resource_type"
            });

        if (error) throw error;

        revalidatePath("/settings");
        return { success: true, error: null };

    } catch (error: any) {
        console.error("Error resetting usage:", error);
        return { success: false, error: "Failed to reset usage" };
    }
}
