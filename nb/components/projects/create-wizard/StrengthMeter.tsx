"use client";

import { useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import type { CreateProjectInput } from "@/lib/validations/project";

export default function ProjectStrengthMeter({ openRolesCount = 0 }: { openRolesCount?: number }) {
    const { watch } = useFormContext<CreateProjectInput>();
    const formData = watch();

    // Calculate score based on fields
    const calculateScore = () => {
        let score = 0;
        let totalWeight = 0;

        const checks = [
            { condition: !!formData.project_type, weight: 10 },
            { condition: !!formData.title && formData.title.length >= 5, weight: 10 },
            { condition: !!formData.short_description && formData.short_description.length >= 10, weight: 15 },
            { condition: !!formData.description && formData.description.length >= 100, weight: 20 },
            { condition: !!formData.creator_role?.title, weight: 10 },
            { condition: (formData.tags?.length || 0) >= 3, weight: 10 },
            { condition: (formData.lifecycle_stages?.length || 0) > 0, weight: 5 },
            { condition: openRolesCount > 0, weight: 10 },
            { condition: !!formData.visibility, weight: 5 },
            { condition: !!formData.goals?.length, weight: 5 },
        ];

        checks.forEach(check => {
            totalWeight += check.weight;
            if (check.condition) score += check.weight;
        });

        return Math.min(100, Math.round((score / totalWeight) * 100));
    };

    const score = calculateScore();

    const getStrengthLabel = (s: number) => {
        if (s < 30) return "Weak";
        if (s < 60) return "Good";
        if (s < 90) return "Strong";
        return "Excellent";
    };

    const getColor = (s: number) => {
        if (s < 30) return "bg-red-500 text-red-600";
        if (s < 60) return "bg-amber-500 text-amber-600";
        if (s < 90) return "bg-emerald-500 text-emerald-600";
        return "bg-indigo-500 text-indigo-600";
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                    <Zap className={`w-3 h-3 ${getColor(score).split(" ")[1]}`} />
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {getStrengthLabel(score)}
                    </span>
                    <span className="text-xs text-zinc-400">({score}%)</span>
                </div>
            </div>

            <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${getColor(score).split(" ")[0]}`}
                />
            </div>
        </div>
    );
}
