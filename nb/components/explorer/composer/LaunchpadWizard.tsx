"use client";

import React from "react";
import { ComposerState, ComposerAction } from "@/hooks/useComposer";
import { Rocket, FlaskConical, Trophy, GraduationCap, Briefcase, Code, Plus, X } from "lucide-react";

interface LaunchpadWizardProps {
    state: ComposerState;
    dispatch: React.Dispatch<ComposerAction>;
    onLaunch: () => void;
}

const PROJECT_TEMPLATES = [
    {
        id: "startup",
        title: "Startup MVP",
        description: "Build and validate a minimum viable product.",
        icon: Rocket,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-50 dark:bg-purple-950/30",
        borderColor: "border-purple-200 dark:border-purple-800",
        stages: ["Ideation", "MVP Development", "Testing", "Launch"],
    },
    {
        id: "research",
        title: "Research Study",
        description: "Conduct an academic or scientific study.",
        icon: FlaskConical,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800",
        stages: ["Literature Review", "Methodology", "Data Collection", "Analysis"],
    },
    {
        id: "hackathon",
        title: "Hackathon Entry",
        description: "Create a prototype for a competition.",
        icon: Trophy,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        stages: ["Brainstorming", "Prototyping", "Demo Prep", "Presentation"],
    },
    {
        id: "course",
        title: "Course Project",
        description: "Complete an educational assignment.",
        icon: GraduationCap,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800",
        stages: ["Analysis", "Implementation", "Testing", "Submission"],
    },
    {
        id: "portfolio",
        title: "Portfolio Builder",
        description: "Showcase your skills and abilities.",
        icon: Briefcase,
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
        borderColor: "border-indigo-200 dark:border-indigo-800",
        stages: ["Planning", "Development", "Polish", "Showcase"],
    },
    {
        id: "open_source",
        title: "Open Source",
        description: "Contribute to or create open source software.",
        icon: Code,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        borderColor: "border-emerald-200 dark:border-emerald-800",
        stages: ["Setup", "Development", "Documentation", "Release"],
    },
    {
        id: "other",
        title: "Custom Project",
        description: "Define your own project type.",
        icon: Plus,
        color: "text-slate-600 dark:text-slate-400",
        bgColor: "bg-slate-50 dark:bg-slate-900/50",
        borderColor: "border-slate-200 dark:border-slate-700",
        stages: ["Planning", "Execution", "Review", "Completion"],
    },
];

export function LaunchpadWizard({ state, dispatch, onLaunch }: LaunchpadWizardProps) {
    const {
        ideaStep, ideaTemplateId, ideaCustomType, ideaTitle, ideaDescription,
        ideaLongDescription, ideaProblem, ideaSolution, ideaTags, ideaTagInput,
        ideaOpenRoles, ideaVisibility, uploading
    } = state;

    // Actions Wrapper
    const setIdeaField = (field: keyof ComposerState, value: any) =>
        dispatch({ type: 'SET_IDEA_FIELD', payload: { field, value } });

    const addTag = () => {
        const t = ideaTagInput.trim();
        if (!t || ideaTags.includes(t)) return;
        dispatch({ type: 'ADD_IDEA_TAG', payload: t });
        dispatch({ type: 'SET_IDEA_FIELD', payload: { field: 'ideaTagInput', value: '' } });
    };

    const addRole = () => dispatch({ type: 'ADD_IDEA_ROLE', payload: { role: "", count: 1, description: "", skills: [] } });
    const addSkillToRole = (index: number, skill: string) => {
        const role = ideaOpenRoles[index];
        if (!role || !skill.trim() || role.skills.includes(skill.trim())) return;
        dispatch({ type: 'UPDATE_IDEA_ROLE', payload: { index, role: { skills: [...role.skills, skill.trim()] } } });
    };

    return (
        <div className="mb-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Wizard Steps */}
            <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
                {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${ideaStep >= step
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}>
                            {step}
                        </div>
                        <span className={`ml-2 text-xs font-medium ${ideaStep >= step ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>
                            {step === 1 && 'Type'}
                            {step === 2 && 'Details'}
                            {step === 3 && 'Team'}
                        </span>
                        {step < 3 && (
                            <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 mx-3" />
                        )}
                    </div>
                ))}
            </div>

            <div className="p-4">
                {/* Step 1: Type Selection */}
                {ideaStep === 1 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {PROJECT_TEMPLATES.map((template) => {
                                const Icon = template.icon;
                                const isSelected = ideaTemplateId === template.id;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => setIdeaField('ideaTemplateId', template.id)}
                                        className={`text-left p-3 rounded-xl border transition-all ${isSelected
                                            ? `border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500`
                                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:bg-zinc-900 dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${template.bgColor} ${template.color}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                    {template.title}
                                                </h4>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                    {template.description}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {ideaTemplateId === "other" && (
                            <input
                                type="text"
                                placeholder="Specify project type..."
                                value={ideaCustomType}
                                onChange={(e) => setIdeaField('ideaCustomType', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        )}
                    </div>
                )}

                {/* Step 2: Details */}
                {ideaStep === 2 && (
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Project Title *"
                            value={ideaTitle}
                            onChange={(e) => setIdeaField('ideaTitle', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                            type="text"
                            placeholder="Short Description (One-liner) *"
                            value={ideaDescription}
                            onChange={(e) => setIdeaField('ideaDescription', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                        <textarea
                            placeholder="Full Description *"
                            value={ideaLongDescription}
                            onChange={(e) => setIdeaField('ideaLongDescription', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <textarea
                                placeholder="The Problem"
                                value={ideaProblem}
                                onChange={(e) => setIdeaField('ideaProblem', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <textarea
                                placeholder="The Solution"
                                value={ideaSolution}
                                onChange={(e) => setIdeaField('ideaSolution', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {ideaTags.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs">
                                        #{tag}
                                        <button onClick={() => dispatch({ type: 'REMOVE_IDEA_TAG', payload: tag })} className="hover:text-indigo-900 dark:hover:text-indigo-100"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Add tags (press Enter)..."
                                value={ideaTagInput}
                                onChange={(e) => setIdeaField('ideaTagInput', e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTag();
                                    }
                                }}
                                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Team */}
                {ideaStep === 3 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Open Roles</label>
                            <button
                                onClick={addRole}
                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                <Plus className="w-3 h-3" /> Add Role
                            </button>
                        </div>

                        {ideaOpenRoles.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <p className="text-xs text-zinc-500">No roles added yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {ideaOpenRoles.map((role, idx) => (
                                    <div key={idx} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                placeholder="Role Title"
                                                value={role.role}
                                                onChange={(e) => dispatch({ type: 'UPDATE_IDEA_ROLE', payload: { index: idx, role: { role: e.target.value } } })}
                                                className="flex-1 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm"
                                            />
                                            <input
                                                type="number"
                                                min="1"
                                                value={role.count}
                                                onChange={(e) => dispatch({ type: 'UPDATE_IDEA_ROLE', payload: { index: idx, role: { count: parseInt(e.target.value) || 1 } } })}
                                                className="w-16 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm"
                                            />
                                            <button onClick={() => dispatch({ type: 'REMOVE_IDEA_ROLE', payload: idx })} className="p-1.5 text-zinc-400 hover:text-red-500">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <input
                                            placeholder="Skills (press Enter to add)"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addSkillToRole(idx, e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                            className="w-full px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm"
                                        />
                                        <div className="flex flex-wrap gap-1">
                                            {role.skills.map(skill => (
                                                <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs">
                                                    {skill}
                                                    <button onClick={() => {
                                                        const newSkills = role.skills.filter(s => s !== skill);
                                                        dispatch({ type: 'UPDATE_IDEA_ROLE', payload: { index: idx, role: { skills: newSkills } } });
                                                    }}><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Visibility</label>
                            <select
                                value={ideaVisibility}
                                onChange={(e) => setIdeaField('ideaVisibility', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                            >
                                <option value="public">Public - Anyone can view</option>
                                <option value="private">Private - Invite only</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Wizard Navigation */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={() => setIdeaField('ideaStep', Math.max(1, ideaStep - 1))}
                    disabled={ideaStep === 1}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 disabled:opacity-50 hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                    Back
                </button>

                {ideaStep < 3 ? (
                    <button
                        onClick={() => {
                            if (ideaStep === 1 && !ideaTemplateId) return;
                            if (ideaStep === 2 && (!ideaTitle.trim() || !ideaDescription.trim() || !ideaLongDescription.trim())) return;
                            setIdeaField('ideaStep', Math.min(3, ideaStep + 1));
                        }}
                        disabled={(ideaStep === 1 && !ideaTemplateId) || (ideaStep === 2 && (!ideaTitle.trim() || !ideaDescription.trim() || !ideaLongDescription.trim()))}
                        className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                    </button>
                ) : (
                    <button
                        onClick={onLaunch}
                        disabled={uploading || !ideaTitle.trim()}
                        className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20"
                    >
                        {uploading ? 'Launching...' : 'Launch Project'}
                    </button>
                )}
            </div>
        </div>
    );
}
