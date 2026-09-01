"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface VisualRoadmapProps {
    stages: string[];
    currentStageIndex: number;
}

export default function VisualRoadmap({ stages, currentStageIndex }: VisualRoadmapProps) {
    const roadmapItems = useMemo(() => {
        return stages.map((stage, index) => {
            let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
            if (index < currentStageIndex) status = 'completed';
            if (index === currentStageIndex) status = 'current';

            return { name: stage, status, index };
        });
    }, [stages, currentStageIndex]);

    return (
        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
            <div className="min-w-[600px] flex items-center relative pt-8 px-4">
                {/* Connecting Line */}
                <div className="absolute top-[45px] left-0 w-full h-1 bg-slate-100 dark:bg-zinc-800" />
                <motion.div
                    className="absolute top-[45px] left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: (currentStageIndex / (stages.length - 1)) }}
                    transition={{ duration: 1, delay: 0.5 }}
                    style={{ width: '100%' }}
                />

                {roadmapItems.map((item, i) => (
                    <div key={i} className="flex-1 relative flex flex-col items-center group">
                        {/* Status Indicator Dot */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className={`
                relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-4 transition-colors duration-300
                ${item.status === 'completed' ? 'bg-indigo-600 border-indigo-100 dark:border-indigo-900' : ''}
                ${item.status === 'current' ? 'bg-white dark:bg-zinc-900 border-indigo-500 shadow-lg shadow-indigo-500/30' : ''}
                ${item.status === 'upcoming' ? 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700' : ''}
              `}
                        >
                            {item.status === 'completed' && (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            {item.status === 'current' && (
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                            )}
                        </motion.div>

                        {/* Label */}
                        <div className={`
              mt-4 text-sm font-medium transition-colors duration-300 text-center px-2
              ${item.status === 'current' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-zinc-500'}
            `}>
                            {item.name}
                        </div>

                        {/* Date/Meta (Placeholder) */}
                        <div className="mt-1 text-[10px] text-slate-400 dark:text-zinc-600 uppercase tracking-wider font-semibold">
                            {item.status === 'completed' ? 'Done' : item.status === 'current' ? 'In Progress' : 'Planned'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
