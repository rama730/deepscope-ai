"use client";

import { useFormContext } from "react-hook-form";
import { Check, Edit2, Rocket, Users, Globe, Lock, Link2, Smartphone, Layers, Tag as TagIcon, FileText } from "lucide-react";
import type { CreateProjectInput } from "@/lib/validations/project";
import type { WizardContextType } from "../useCreateProjectWizard";
import { cn } from "@/lib/utils";

interface Props {
    wizardContext: WizardContextType;
    goToPhase: (phase: 1 | 2 | 3 | 4 | 5) => void;
}

interface CheckItem {
    label: string;
    isComplete: boolean;
    required?: boolean;
}

const PROJECT_TYPES: Record<string, string> = {
    startup: "Startup MVP", hackathon: "Hackathon Entry", portfolio: "Portfolio Project",
    research: "Research Study", course: "Course Project", open_source: "Open Source",
    saas: "SaaS Product", mobile_app: "Mobile App", ai_ml: "AI/ML Project",
    game: "Game Development", content_creator: "Content Creation", client_project: "Client Project",
    ecommerce: "E-commerce Store", nonprofit: "Non-Profit", skill_development: "Skill Development",
    event: "Event Host", other: "Custom Project",
};

const VISIBILITY_META: Record<string, { icon: React.ElementType; label: string }> = {
    public: { icon: Globe, label: "Public" },
    unlisted: { icon: Link2, label: "Unlisted" },
    private: { icon: Lock, label: "Private" },
};

import { useState } from "react";
import ProjectCard from "../../ProjectCard";

export default function Phase5Review({ wizardContext, goToPhase }: Props) {
    const { watch } = useFormContext<CreateProjectInput>();
    const formData = watch();
    const { openRoles } = wizardContext;
    const [isPreview, setIsPreview] = useState(false);

    const visibilityKey = (formData.visibility && formData.visibility in VISIBILITY_META)
        ? (formData.visibility as keyof typeof VISIBILITY_META)
        : "public";

    const checkItems: CheckItem[] = [
        { label: "Project Type", isComplete: !!formData.project_type, required: true },
        { label: "Title", isComplete: !!formData.title && formData.title.length >= 3, required: true },
        { label: "Description", isComplete: !!formData.description && formData.description.length >= 50, required: true },
        { label: "Your Role", isComplete: !!formData.creator_role?.title, required: true },
        { label: "Visibility", isComplete: !!formData.visibility, required: true },
    ];

    const requiredComplete = checkItems.filter(i => i.required).every(i => i.isComplete);
    const VisConfig = VISIBILITY_META[visibilityKey] ?? VISIBILITY_META.public;
    const VisIcon = VisConfig?.icon ?? Globe;

    return (
        <div className="space-y-8">
            <div className="flex flex-col items-center mb-8">
                <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Review Project Details</h3>
                    <p className="text-zinc-500 dark:text-zinc-400">Confirm everything is correct before launching.</p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <button
                        onClick={() => setIsPreview(false)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            !isPreview ? "bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                    >
                        Review
                    </button>
                    <button
                        onClick={() => setIsPreview(true)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            isPreview ? "bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                    >
                        Preview Card
                    </button>
                </div>
            </div>

            {isPreview ? (
                <div className="flex justify-center">
                    <div className="w-full max-w-sm">
                        <ProjectCard
                            project={{
                                id: "preview",
                                title: formData.title || "Untitled Project",
                                description: formData.description,
                                short_description: formData.short_description,
                                technologies_used: formData.technologies_used || [],
                                status: "open",
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                last_activity_at: new Date().toISOString(),
                                view_count: 0,
                                creator_id: "preview-creator",
                                profiles: {
                                    full_name: "You",
                                    avatar_url: null,
                                    username: null,
                                },
                            }}
                            previewMode={true}
                            initialOpenRoles={openRoles.map((r, idx) => ({
                                id: `preview-role-${idx}-${r.role}`,
                                title: r.role,
                                role: r.role,
                                count: r.count,
                                filled: 0,
                                project_id: "preview",
                            }))}
                            initialCollaborators={[
                                { full_name: formData.creator_role?.title || "Project Lead" }
                            ]}
                        />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Section 1: Project Basics */}
                        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-zinc-400" />
                                    Project Overview
                                </h4>
                                <button onClick={() => goToPhase(2)} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1">
                                    Edit <Edit2 className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                                        {formData.title || "Untitled Project"}
                                    </h2>
                                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                                        {formData.short_description || "No tagline added"}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                                        <Smartphone className="w-4 h-4 text-zinc-500" />
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            {PROJECT_TYPES[formData.project_type] || "Custom Project"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                                        <VisIcon className="w-4 h-4 text-zinc-500" />
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            {VisConfig?.label ?? "Public"}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <h5 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-2 flex items-center gap-2">
                                        <FileText className="w-3 h-3" /> Description
                                    </h5>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                        {formData.description || "No description provided."}
                                    </p>
                                </div>

                                {formData.tags && formData.tags.length > 0 && (
                                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                        <h5 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-3 flex items-center gap-2">
                                            <TagIcon className="w-3 h-3" /> Tags
                                        </h5>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.tags.map(tag => (
                                                <span key={tag} className="px-2.5 py-1 rounded-md bg-zinc-50 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-700">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Section 2: Team */}
                        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-zinc-400" />
                                    Team Structure
                                </h4>
                                <button onClick={() => goToPhase(3)} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1">
                                    Edit <Edit2 className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Creator Card */}
                                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">YOU</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{formData.creator_role?.title || "Project Lead"}</p>
                                            <p className="text-xs text-zinc-500">Creator Role</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Open Roles */}
                                {openRoles.map((role, i) => (
                                    <div key={i} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{role.count}x</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{role.role}</p>
                                                <p className="text-xs text-zinc-500 capitalize">{role.experience_level} Level</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {openRoles.length === 0 && (
                                <p className="text-zinc-400 italic text-sm text-center py-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                                    No additional open roles defined.
                                </p>
                            )}
                        </section>
                    </div>

                    {/* Status Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                Overview Status
                            </h4>
                            <div className="space-y-3">
                                {checkItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                        <span className={item.isComplete ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400"}>
                                            {item.label}
                                        </span>
                                        {item.isComplete ? (
                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-xs font-medium">
                                                <Check className="w-3 h-3" /> Done
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-zinc-400 px-2 py-0.5 text-xs font-medium">
                                                Pending
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                                {requiredComplete ? (
                                    <div className="text-center">
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-3">
                                            <Rocket className="w-5 h-5" />
                                        </div>
                                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                            Ready to create project
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-sm text-zinc-500">
                                            Complete all required fields to proceed.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
