"use client";

import { motion } from "framer-motion";

import {
    Code2,
    Database,
    Layout,
    Smartphone,
    Cloud,
    Terminal,
    Cpu,
    Globe,
    Box,
    Figma,
    Github,
    Server,
    Zap
} from "lucide-react";

interface TechStackFilterProps {
    selectedTech: string[];
    onToggle: (tech: string) => void;
}

const TECH_STACKS = [
    { id: "react", label: "React", icon: Code2, color: "text-blue-500" },
    { id: "nextjs", label: "Next.js", icon: Globe, color: "text-slate-900 dark:text-white" },
    { id: "typescript", label: "TypeScript", icon: Code2, color: "text-blue-600" },
    { id: "python", label: "Python", icon: Terminal, color: "text-yellow-500" },
    { id: "node", label: "Node.js", icon: Server, color: "text-green-600" },
    { id: "supabase", label: "Supabase", icon: Database, color: "text-emerald-500" },
    { id: "tailwind", label: "Tailwind", icon: Layout, color: "text-cyan-500" },
    { id: "flutter", label: "Flutter", icon: Smartphone, color: "text-blue-400" },
    { id: "aws", label: "AWS", icon: Cloud, color: "text-orange-500" },
    { id: "docker", label: "Docker", icon: Box, color: "text-blue-500" },
    { id: "figma", label: "Figma", icon: Figma, color: "text-purple-500" },
    { id: "github", label: "GitHub", icon: Github, color: "text-slate-900 dark:text-white" },
    { id: "ai", label: "AI/ML", icon: Cpu, color: "text-rose-500" },
    { id: "web3", label: "Web3", icon: Zap, color: "text-indigo-500" },
];

export default function TechStackFilter({ selectedTech, onToggle }: TechStackFilterProps) {
    return (
        <div className="w-full overflow-hidden">
            <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide mask-linear-fade">
                {TECH_STACKS.map((tech) => {
                    const isSelected = selectedTech.includes(tech.id);
                    const Icon = tech.icon;

                    return (
                        <motion.button
                            key={tech.id}
                            onClick={() => onToggle(tech.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 flex-shrink-0
                ${isSelected
                                    ? "bg-white dark:bg-zinc-800 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
                                    : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                                }
              `}
                        >
                            <Icon className={`w-4 h-4 ${isSelected ? tech.color : "text-slate-400 dark:text-zinc-500"}`} />
                            <span className={`text-sm font-medium ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-zinc-400"}`}>
                                {tech.label}
                            </span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
