"use client";

import { ArrowLeft, ArrowRight, Rocket, Save, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
    phase: number;
    totalPhases: number;
    onBack: () => void;
    onNext: () => void;
    onSaveDraft: () => void;
    isSubmitting: boolean;
    isSavingDraft: boolean;
    saveStatus?: "idle" | "saving" | "saved" | "error";
    lastSaved?: Date | null;
}

import ProjectStrengthMeter from "./StrengthMeter";

export default function WizardFooter({
    phase,
    totalPhases,
    onBack,
    onNext,
    onSaveDraft,
    isSubmitting,
    isSavingDraft,
    saveStatus = "idle",
}: Props) {
    const isFirstPhase = phase === 1;
    const isLastPhase = phase === totalPhases;



    return (
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
                {/* Left: Back & Draft */}
                <div className="flex items-center gap-3">
                    {!isFirstPhase && (
                        <motion.button
                            type="button"
                            onClick={onBack}
                            whileHover={{ x: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="font-medium">Back</span>
                        </motion.button>
                    )}

                    <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1 hidden sm:block" />

                    <ProjectStrengthMeter />
                </div>

                {/* Right: Save & Next */}
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={onSaveDraft}
                        disabled={isSavingDraft || saveStatus === "saved"}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all disabled:opacity-75 text-sm ${saveStatus === "saved"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : saveStatus === "error"
                                ? "text-red-600 dark:text-red-400"
                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                    >
                        {saveStatus === "saved" ? (
                            <Clock className="w-4 h-4" />
                        ) : (
                            <Save className={`w-4 h-4 ${isSavingDraft ? "animate-pulse" : ""}`} />
                        )}
                        <span className="font-medium hidden sm:inline">
                            {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving..." : "Save Draft"}
                        </span>
                    </button>

                    {!isLastPhase ? (
                        <motion.button
                            type="button"
                            onClick={onNext}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-colors text-sm"
                        >
                            <span>Next</span>
                            <ArrowRight className="w-4 h-4" />
                        </motion.button>
                    ) : (
                        <motion.button
                            type="submit"
                            form="create-project-form"
                            disabled={isSubmitting}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-70 text-sm"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <Rocket className="w-4 h-4" />
                                    <span>Create Project</span>
                                </>
                            )}
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
}
