"use client";

import { motion } from "framer-motion";

interface Props {
    currentPhase: number;
    totalPhases: number;
}

export default function WizardHeader({ currentPhase, totalPhases }: Props) {
    return (
        <div className="flex items-center w-full mt-2">
            {Array.from({ length: totalPhases }, (_, i) => {
                const stepNum = i + 1;
                const isCompleted = stepNum < currentPhase;
                const isCurrent = stepNum === currentPhase;

                return (
                    <div key={i} className={`flex items-center ${i < totalPhases - 1 ? 'flex-1' : ''}`}>
                        {/* Dot */}
                        <motion.div
                            initial={false}
                            animate={{
                                backgroundColor: isCompleted || isCurrent ? "rgb(79, 70, 229)" : "rgb(228, 228, 231)",
                            }}
                            className={`rounded-full flex-shrink-0 relative z-10 transition-all duration-300 border-2 border-white dark:border-zinc-900 box-content
                                ${isCurrent
                                    ? "w-3 h-3 ring-4 ring-indigo-100 dark:ring-indigo-900/30 bg-indigo-600"
                                    : isCompleted
                                        ? "w-2.5 h-2.5 bg-indigo-600"
                                        : "w-2.5 h-2.5 bg-zinc-200 dark:bg-zinc-700"
                                }`}
                        />

                        {/* Line (if not last) */}
                        {i < totalPhases - 1 && (
                            <div className="flex-1 h-[2px] -mx-0.5 bg-zinc-200 dark:bg-zinc-800 relative z-0">
                                <motion.div
                                    className="absolute inset-y-0 left-0 bg-indigo-600 origin-left"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
