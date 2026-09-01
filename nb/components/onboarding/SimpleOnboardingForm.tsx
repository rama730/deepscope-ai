"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import UsernameInput from "@/components/UsernameInput";
import { Loader2, ArrowRight } from "lucide-react";

interface SimpleOnboardingFormProps {
    user: User;
    initialUsername?: string;
}

export default function SimpleOnboardingForm({ user, initialUsername }: SimpleOnboardingFormProps) {
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();
    const [username, setUsername] = useState(initialUsername || "");
    const [isUsernameValid, setIsUsernameValid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!isUsernameValid) return;

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("profiles")
                .upsert({
                    id: user.id, // Required for upsert
                    username: username.toLowerCase(),
                    onboarding_completed: true,
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (updateError) throw updateError;



            router.push("/explorer");
            router.refresh();

        } catch (err: any) {
            console.error("Onboarding error:", err);
            setError(err.message || "Failed to save profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Username
                </label>
                <UsernameInput
                    value={username}
                    onChange={setUsername}
                    onValidation={setIsUsernameValid}
                    excludeUserId={user.id}
                />
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={!isUsernameValid || loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Setting up...
                    </>
                ) : (
                    <>
                        Get Started
                        <ArrowRight size={18} />
                    </>
                )}
            </button>
        </div>
    );
}
