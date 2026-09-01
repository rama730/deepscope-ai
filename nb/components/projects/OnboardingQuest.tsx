"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, MessageCircle, Bug, BookOpen, Rocket } from "lucide-react";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface OnboardingQuestProps {
    projectId: string;
    isMember: boolean;
    currentUserId: string | null;
}

interface QuestStep {
    id: string;
    label: string;
    icon: any;
    completed: boolean;
    action: () => void;
}

export default function OnboardingQuest({ projectId, isMember, currentUserId }: OnboardingQuestProps) {
    const [steps, setSteps] = useState<QuestStep[]>([
        { id: "manifest", label: "Read the Manifest", icon: BookOpen, completed: false, action: () => { } },
        { id: "chat", label: "Join the Chat", icon: MessageCircle, completed: false, action: () => { } },
        { id: "issue", label: "Pick First Issue", icon: Bug, completed: false, action: () => { } },
    ]);

    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        if (currentUserId && projectId) {
            loadProgress();
        }
    }, [currentUserId, projectId]);

    async function loadProgress() {
        // In a real app, we would fetch this from a 'user_project_onboarding' table
        // For now, we'll simulate it or check related tables
        // Simulation:
        const { data: chatMessages } = await supabase
            .from("project_chat_messages")
            .select("id")
            .eq("project_id", projectId)
            .eq("user_id", currentUserId)
            .limit(1);

        setSteps(prev => prev.map(s => {
            if (s.id === "chat" && chatMessages && chatMessages.length > 0) return { ...s, completed: true };
            return s;
        }));
    }

    const progress = Math.round((steps.filter(s => s.completed).length / steps.length) * 100);

    if (!isMember) return null;

    return (
        <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/10 dark:to-zinc-900 overflow-hidden">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-indigo-500" />
                            Getting Started Quest
                        </h3>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                            Complete these steps to earn your Contributor Badge
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{progress}%</span>
                    </div>
                </div>

                <div className="w-full h-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-6 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    />
                </div>

                <div className="space-y-3">
                    {steps.map((step) => {
                        const Icon = step.icon;
                        return (
                            <button
                                key={step.id}
                                onClick={step.action}
                                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${step.completed
                                    ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30"
                                    : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${step.completed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 dark:bg-zinc-700 text-slate-500"
                                        }`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className={`text-sm font-medium ${step.completed ? "text-emerald-900 dark:text-emerald-100" : "text-slate-700 dark:text-zinc-300"
                                        }`}>
                                        {step.label}
                                    </span>
                                </div>
                                {step.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <Circle className="w-5 h-5 text-slate-300 dark:text-zinc-600" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
