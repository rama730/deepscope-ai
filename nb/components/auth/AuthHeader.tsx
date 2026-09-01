"use client";

import { useAuthStore } from "@/stores/useAuthStore";

interface AuthHeaderProps {
    title?: string;
    subtitle?: string;
    loading?: boolean;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
    const { rememberedName } = useAuthStore();

    const displayTitle = title || (rememberedName
        ? `Welcome back, ${rememberedName.split(' ')[0]}!`
        : "Welcome Back!");

    return (
        <div className="text-center mb-8 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {displayTitle}
            </h1>
            {subtitle && (
                <p className="text-muted-foreground">
                    {subtitle}
                </p>
            )}
        </div>
    );
}
