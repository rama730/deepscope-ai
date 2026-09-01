"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import { FileText, Lightbulb, Tag, Code2, Users, Calendar, Plus, X, AlertCircle, Target, Sparkles } from "lucide-react";
import type { CreateProjectInput } from "@/lib/validations/project";
import { cn } from "@/lib/utils";

const SUGGESTED_TAGS = ["react", "nextjs", "typescript", "python", "ai", "ml", "web3", "mobile", "saas", "fintech"];
const POPULAR_TECH = ["React", "Next.js", "TypeScript", "Node.js", "Python", "PostgreSQL", "Supabase", "Tailwind CSS"];

import FocusModeWrapper from "../FocusMode";

export default function Phase2Information() {
    const { register, setValue, watch, formState: { errors } } = useFormContext<CreateProjectInput>();
    const title = watch("title") || "";
    const shortDescription = watch("short_description") || "";
    const description = watch("description") || "";
    const problemStatement = watch("problem_statement") || "";
    const solutionOverview = watch("solution_overview") || "";
    const tags = watch("tags") || [];
    const technologies = watch("technologies_used") || [];
    const goals = watch("goals") || [];

    const [tagInput, setTagInput] = useState("");
    const [techInput, setTechInput] = useState("");
    const [goalInput, setGoalInput] = useState("");
    const [isDescriptionFocus, setIsDescriptionFocus] = useState(false);
    const [isRefining, setIsRefining] = useState(false);

    const addTag = (tag: string) => {
        const clean = tag.trim().toLowerCase();
        if (clean && !tags.includes(clean) && tags.length < 8) {
            setValue("tags", [...tags, clean]);
        }
        setTagInput("");
    };

    const addTech = (tech: string) => {
        const clean = tech.trim();
        if (clean && !technologies.includes(clean) && technologies.length < 15) {
            setValue("technologies_used", [...technologies, clean]);
        }
        setTechInput("");
    };

    const addGoal = () => {
        const clean = goalInput.trim();
        if (clean && goals.length < 5) {
            setValue("goals", [...goals, clean]);
            setGoalInput("");
        }
    };

    return (
        <div className="space-y-8">
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Tell us about your project</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Share your vision with potential collaborators</p>
            </div>

            {/* Basic Info */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-indigo-500" />Basic Information
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Project Title <span className="text-red-500">*</span></label>
                    <input {...register("title")} placeholder="Enter a catchy, descriptive title" className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    <div className="flex justify-between text-xs">
                        <span className={title.length > 100 ? "text-red-500" : "text-zinc-400"}>{title.length}/100</span>
                        {errors.title && <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.title.message}</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tagline</label>
                    <input {...register("short_description")} placeholder="One sentence pitch" className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    <span className={`text-xs ${shortDescription.length > 80 ? "text-red-500" : "text-zinc-400"}`}>{shortDescription.length}/80</span>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description <span className="text-red-500">*</span></label>
                        <button
                            type="button"
                            disabled={isRefining || !description}
                            onClick={() => {
                                setIsRefining(true);
                                setTimeout(() => {
                                    setIsRefining(false);
                                    // Simulation: Just trim and maybe add a "refined" note or formatting
                                    const currentDesc = watch("description");
                                    if (currentDesc) {
                                        setValue("description", currentDesc.trim() + " "); // Trigger change
                                        // In a real app, this would call an AI API
                                    }
                                }, 1500);
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors"
                        >
                            {isRefining ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                                    Refining...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 h-3" />
                                    Refine with AI
                                </>
                            )}
                        </button>
                    </div>
                    <FocusModeWrapper
                        isActive={isDescriptionFocus}
                        onToggle={() => setIsDescriptionFocus(!isDescriptionFocus)}
                        placeholder="Describe your project in detail..."
                    >
                        <textarea
                            {...register("description")}
                            rows={isDescriptionFocus ? 15 : 4}
                            placeholder="Detailed description..."
                            className={cn(
                                "w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none",
                                isDescriptionFocus && "text-lg ring-0 border-none bg-transparent dark:bg-transparent resize-none h-full"
                            )}
                        />
                    </FocusModeWrapper>
                    <div className="flex justify-between text-xs">
                        <span className={description.length < 50 ? "text-amber-500" : "text-zinc-400"}>{description.length}/2000 {description.length < 50 && "(min 50)"}</span>
                        {errors.description && <span className="text-red-500">{errors.description.message}</span>}
                    </div>
                </div>
            </div>

            {/* Vision */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4 text-amber-500" />The Vision
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Problem Statement</label>
                    <textarea {...register("problem_statement")} rows={3} placeholder="What problem are you solving?" className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" />
                    <span className={`text-xs ${problemStatement.length > 500 ? "text-red-500" : "text-zinc-400"}`}>{problemStatement.length}/500</span>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Solution Overview</label>
                    <textarea {...register("solution_overview")} rows={3} placeholder="How do you solve it?" className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" />
                    <span className={`text-xs ${solutionOverview.length > 500 ? "text-red-500" : "text-zinc-400"}`}>{solutionOverview.length}/500</span>
                </div>
            </div>

            {/* Tags & Tech */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    <Tag className="w-4 h-4 text-violet-500" />Categorization
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Topics / Tags (up to 8)</label>
                    <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} placeholder="Type and press Enter..." className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    <div className="flex flex-wrap gap-2">
                        {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 5).map(tag => (
                            <button key={tag} type="button" onClick={() => addTag(tag)} className="px-2 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30">+ {tag}</button>
                        ))}
                    </div>
                    {tags.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{tags.map(tag => <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">{tag}<button type="button" onClick={() => setValue("tags", tags.filter(t => t !== tag))}><X className="w-3.5 h-3.5" /></button></span>)}</div>}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"><Code2 className="w-4 h-4 inline mr-1 text-emerald-500" />Tech Stack (up to 15)</label>
                    <input type="text" value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(techInput); } }} placeholder="Type and press Enter..." className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    <div className="flex flex-wrap gap-2">
                        {POPULAR_TECH.filter(t => !technologies.includes(t)).slice(0, 5).map(tech => (
                            <button key={tech} type="button" onClick={() => addTech(tech)} className="px-2 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">+ {tech}</button>
                        ))}
                    </div>
                    {technologies.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{technologies.map(tech => <span key={tech} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">{tech}<button type="button" onClick={() => setValue("technologies_used", technologies.filter(t => t !== tech))}><X className="w-3.5 h-3.5" /></button></span>)}</div>}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"><Users className="w-4 h-4 inline mr-1 text-blue-500" />Target Audience</label>
                    <input {...register("target_audience")} placeholder="e.g., Developers, Students" className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
            </div>

            {/* Timeline & Goals */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-rose-500" />Timeline & Goals
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Start Date</label>
                        <input type="date" {...register("expected_start_date")} className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">End Date</label>
                        <input type="date" {...register("expected_end_date")} className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"><Target className="w-4 h-4 inline mr-1 text-amber-500" />Goals (up to 5)</label>
                    <div className="flex gap-2">
                        <input type="text" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } }} placeholder="e.g., Launch MVP" className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        <button type="button" onClick={addGoal} disabled={goals.length >= 5} className="px-4 py-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 disabled:opacity-50"><Plus className="w-5 h-5" /></button>
                    </div>
                    {goals.length > 0 && <div className="space-y-2 mt-2">{goals.map((goal, i) => <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"><span className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center">{i + 1}</span><span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{goal}</span><button type="button" onClick={() => setValue("goals", goals.filter((_, idx) => idx !== i))} className="text-amber-600 dark:text-amber-400"><X className="w-4 h-4" /></button></motion.div>)}</div>}
                </div>
            </div>
        </div>
    );
}
