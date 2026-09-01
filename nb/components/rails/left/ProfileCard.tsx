"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOnboardingStatus, useProfileStats } from "@/hooks/useRailQueries";
import { logger } from "@/lib/logger";
import {
    User, Zap, Users, Sparkles, Check, ChevronDown, ChevronRight
} from "lucide-react";

const ONBOARDING_ITEMS = [
    { id: "profile", label: "Complete your profile", step: "profile", icon: User },
    { id: "interests", label: "Add interests", step: "interests", icon: Zap },
    { id: "people", label: "Connect with people", step: "recommendations", icon: Users },
    { id: "security", label: "Add a passkey", step: "settings", icon: Sparkles },
    { id: "finish", label: "Finish onboarding", step: "review", icon: Sparkles },
] as const;

export default function ProfileCard({ profile, userId }: { profile: any; userId: string }) {
    const supabase = createSupabaseBrowserClient();
    const router = useRouter();

    const { data: onboardingData } = useOnboardingStatus(userId);
    const { data: statsData } = useProfileStats(userId);

    const [completionData, setCompletionData] = useState<{
        percentage: number;
        missingItems: typeof ONBOARDING_ITEMS;
    }>({ percentage: 0, missingItems: [] as any });

    const [completionById, setCompletionById] = useState<Record<string, boolean>>({});
    const [showCompletionSection, setShowCompletionSection] = useState(false);

    const availabilityColors: Record<string, string> = {
        available: "bg-green-500",
        busy: "bg-amber-500",
        away: "bg-zinc-500",
    };

    const availabilityLabels: Record<string, string> = {
        available: "Open to collaborate",
        busy: "Currently busy",
        away: "Away",
    };

    const [status, setStatus] = useState(profile.availability_status || "available");

    // Calculate onboarding completion
    useEffect(() => {
        if (!onboardingData || !statsData) return;

        const completed = !!onboardingData.onboarding_completed;
        const step = (onboardingData.onboarding_step || "profile") as string;

        // Fallback: if onboarding_step is missing/old but user has a username + avatar, treat Profile as done.
        const hasBasicIdentity = !!(onboardingData.username && onboardingData.username.trim().length > 0) && !!onboardingData.avatar_url;

        const isProfileDone = completed || step !== "profile" || hasBasicIdentity;
        const isInterestsDone = statsData.onboarding.hasInterests;
        const isPeopleDone = statsData.onboarding.hasConnections;
        const isSecurityDone = statsData.onboarding.hasSecurity;
        const isFinishDone = completed;

        const byId: Record<string, boolean> = {
            profile: isProfileDone,
            interests: isInterestsDone,
            people: isPeopleDone,
            security: isSecurityDone,
            finish: isFinishDone,
        };
        setCompletionById(byId);

        const missing: any[] = [];
        if (completed) {
            if (!isInterestsDone) missing.push(ONBOARDING_ITEMS.find(i => i.id === "interests"));
            if (!isPeopleDone) missing.push(ONBOARDING_ITEMS.find(i => i.id === "people"));
            if (!isSecurityDone) missing.push(ONBOARDING_ITEMS.find(i => i.id === "security"));

            const optionalTotal = 3;
            const optionalDone = [isInterestsDone, isPeopleDone, isSecurityDone].filter(Boolean).length;
            const percentage = Math.round((optionalDone / optionalTotal) * 100);
            setCompletionData({ percentage, missingItems: missing.filter(Boolean) as any });
            return;
        }

        if (!isProfileDone) missing.push(ONBOARDING_ITEMS.find(i => i.id === "profile"));
        if (!isInterestsDone) missing.push(ONBOARDING_ITEMS.find(i => i.id === "interests"));
        if (!isPeopleDone) missing.push(ONBOARDING_ITEMS.find(i => i.id === "people"));
        if (!isSecurityDone) missing.push(ONBOARDING_ITEMS.find(i => i.id === "security"));
        if (!isFinishDone) missing.push(ONBOARDING_ITEMS.find(i => i.id === "finish"));

        const doneCount = Object.values(byId).filter(Boolean).length;
        const percentage = Math.round((doneCount / 5) * 100);
        setCompletionData({ percentage, missingItems: missing.filter(Boolean) as any });

    }, [onboardingData, statsData]);

    const handleCompletionItemClick = async (item: typeof ONBOARDING_ITEMS[number]) => {
        try {
            await supabase
                .from("profiles")
                .update({ onboarding_step: item.step, updated_at: new Date().toISOString() })
                .eq("id", userId);
        } catch { }
        router.push(`/onboarding?from=explorer&step=${encodeURIComponent(item.step)}`);
    };

    // SVG ring calculation
    const ringSize = 52;
    const strokeWidth = 3;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (completionData.percentage / 100) * circumference;

    return (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Clean white header (no gradients) */}
            <div className="h-12 bg-white dark:bg-zinc-900 relative border-b border-zinc-200 dark:border-zinc-800">
                {/* Avatar with completion ring */}
                <div className="absolute -bottom-5 left-3">
                    <div className="relative">
                        <svg
                            width={ringSize}
                            height={ringSize}
                            className="absolute -top-0.5 -left-0.5 transform -rotate-90"
                        >
                            <circle
                                cx={ringSize / 2}
                                cy={ringSize / 2}
                                r={radius}
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth={strokeWidth}
                            />
                            <circle
                                cx={ringSize / 2}
                                cy={ringSize / 2}
                                r={radius}
                                fill="none"
                                stroke={completionData.percentage === 100 ? "#22c55e" : "#0ea5e9"}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>

                        <Link href="/profile">
                            <div className="relative h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-200 text-base font-bold border-3 border-white dark:border-zinc-900 overflow-hidden hover:scale-105 transition-transform">
                                {profile.avatar_url ? (
                                    <Image
                                        src={profile.avatar_url}
                                        alt={profile.full_name || profile.username || "User"}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    (profile.full_name || profile.username || "U").slice(0, 1).toUpperCase()
                                )}
                            </div>
                        </Link>

                        <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${availabilityColors[status]}`} />
                    </div>
                </div>
            </div>

            <div className="pt-10 px-3 pb-3">
                <Link href="/profile" className="group">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {profile.full_name || profile.username || "User"}
                    </h3>
                    {profile.username && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">@{profile.username}</p>
                    )}
                </Link>

                {profile.headline && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-1">{profile.headline}</p>
                )}

                {/* Availability Badge - Compact with Toggle */}
                <div className="mt-2 flex items-center gap-1.5">
                    <button
                        onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const statuses: Array<keyof typeof availabilityLabels> = ["available", "busy", "away"];
                            const currentIndex = statuses.indexOf(status as keyof typeof availabilityLabels);
                            const nextStatus = statuses[(currentIndex + 1) % statuses.length];

                            try {
                                const { error } = await supabase
                                    .from("profiles")
                                    .update({ availability_status: nextStatus })
                                    .eq("id", userId);

                                if (!error) {
                                    setStatus(nextStatus);
                                }
                            } catch (err) {
                                logger.error("Error updating availability", { error: err });
                            }
                        }}
                        className="flex items-center gap-1.5 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 px-1.5 py-0.5 rounded transition-colors group"
                        title="Click to change availability"
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${availabilityColors[status]} group-hover:ring-2 group-hover:ring-offset-1 transition-all`} />
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">{availabilityLabels[status]}</span>
                    </button>
                </div>

                {/* Finish setup (shown only when there is something left to do) */}
                {completionData.missingItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            onClick={() => setShowCompletionSection(!showCompletionSection)}
                            className="w-full flex items-center justify-between text-left"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Finish setup</span>
                                <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                                >
                                    {completionData.percentage}%
                                </span>
                            </div>
                            <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 transition-transform ${showCompletionSection ? "rotate-180" : ""}`} />
                        </button>

                        {/* Expandable onboarding items (show checks for completed steps) */}
                        {showCompletionSection && (
                            <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                {ONBOARDING_ITEMS.map((item) => {
                                    const done = !!completionById[item.id];
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => (!done ? handleCompletionItemClick(item as any) : undefined)}
                                            className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group/item ${done ? "opacity-70 cursor-default" : "hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                                }`}
                                        >
                                            <div
                                                className={`p-1 rounded ${done ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-zinc-100 dark:bg-zinc-800"
                                                    }`}
                                            >
                                                {done ? (
                                                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                                ) : (
                                                    <item.icon className="h-3 w-3 text-zinc-700 dark:text-zinc-200" />
                                                )}
                                            </div>
                                            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 group-hover/item:text-zinc-900 dark:group-hover/item:text-white flex-1">
                                                {item.label}
                                            </span>
                                            {done ? (
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Done</span>
                                            ) : (
                                                <ChevronRight className="h-3 w-3 text-zinc-400 dark:text-zinc-600 group-hover/item:text-zinc-600 dark:group-hover/item:text-zinc-400" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
