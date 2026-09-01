"use client";

import { useFormContext } from "react-hook-form";
import { useRef } from "react";
import { Eye, Link2, Lock, Globe, Shield, Bell, MessageCircle, CheckSquare, Mail, ExternalLink, Users, Info } from "lucide-react";
import type { CreateProjectInput } from "@/lib/validations/project";

const VISIBILITY_OPTIONS = [
    { id: "public", label: "Public", desc: "Anyone can view and apply", icon: Globe, color: "emerald", borderClass: "border-emerald-500", bgClass: "bg-emerald-50 dark:bg-emerald-950/30", iconBgClass: "bg-emerald-100 dark:bg-emerald-900/30", iconClass: "text-emerald-600 dark:text-emerald-400" },
    { id: "unlisted", label: "Unlisted", desc: "Only via direct link", icon: Link2, color: "amber", borderClass: "border-amber-500", bgClass: "bg-amber-50 dark:bg-amber-950/30", iconBgClass: "bg-amber-100 dark:bg-amber-900/30", iconClass: "text-amber-600 dark:text-amber-400" },
    { id: "private", label: "Private", desc: "Invite-only", icon: Lock, color: "red", borderClass: "border-red-500", bgClass: "bg-red-50 dark:bg-red-950/30", iconBgClass: "bg-red-100 dark:bg-red-900/30", iconClass: "text-red-600 dark:text-red-400" },
];

const IP_OPTIONS = [
    { id: "creator", label: "Creator Owns All" },
    { id: "shared", label: "Shared Ownership" },
    { id: "open_source", label: "Open Source" },
    { id: "discuss", label: "To Be Discussed" },
];

const NDA_OPTIONS = [
    { id: "none", label: "No NDA" },
    { id: "simple", label: "Simple NDA" },
    { id: "custom", label: "Custom NDA" },
];

const LICENSE_OPTIONS = ["MIT", "Apache 2.0", "GPL 3.0", "BSD 3-Clause", "ISC", "MPL 2.0", "None / Proprietary"];

// Stricter email validation regex that enforces valid local/domain parts and TLD length
const isValidEmail = (email: string): boolean => {
    // More strict regex: requires at least one character before @, valid domain with dot, and TLD of 2-6 chars
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
};

export default function Phase4Settings() {
    const { setValue, watch } = useFormContext<CreateProjectInput>();
    const visibility = watch("visibility");
    const applicationSettings = watch("application_settings");
    const terms = watch("terms");
    const externalLinks = watch("external_links");
    const notificationPreferences = watch("notification_preferences");
    const teamSettings = watch("team_settings");
    const inviteEmailInputRef = useRef<HTMLInputElement>(null);

    const updateAppSettings = (field: string, value: any) => {
        setValue("application_settings", { ...applicationSettings, [field]: value } as any);
    };

    const updateTerms = (field: string, value: any) => {
        setValue("terms", { ...terms, [field]: value } as any);
    };

    const updateLinks = (field: string, value: string) => {
        setValue("external_links", { ...externalLinks, [field]: value } as any);
    };

    const updateNotifications = (field: string, value: boolean) => {
        setValue("notification_preferences", { ...notificationPreferences, [field]: value } as any);
    };

    const updateTeamSettings = (field: string, value: any) => {
        setValue("team_settings", { ...teamSettings, [field]: value } as any);
    };

    const handleAddInvite = (email?: string) => {
        const emailValue = email?.trim() || inviteEmailInputRef.current?.value.trim() || "";
        if (!emailValue) return;

        if (!isValidEmail(emailValue)) {
            // Could add toast notification here if needed
            return;
        }

        const currentInvites = (watch("metadata")?.invites as string[]) || [];
        if (!currentInvites.includes(emailValue)) {
            setValue("metadata", { ...watch("metadata"), invites: [...currentInvites, emailValue] });
            if (inviteEmailInputRef.current) {
                inviteEmailInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="space-y-8">
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Project Settings</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Configure visibility, access, and terms</p>
            </div>

            {/* Team Settings (Moved from Phase 3) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-blue-500" />Team Configuration
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ideal Team Size</label>
                        <select value={teamSettings?.ideal_size || ""} onChange={(e) => updateTeamSettings("ideal_size", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                            <option value="">Select...</option>
                            <option value="2-3">2-3 members</option>
                            <option value="3-5">3-5 members</option>
                            <option value="5-10">5-10 members</option>
                            <option value="10+">10+ members</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Collaboration Style</label>
                        <select value={teamSettings?.collaboration_style || ""} onChange={(e) => updateTeamSettings("collaboration_style", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                            <option value="">Select...</option>
                            <option value="async">Async-first (Different timezones OK)</option>
                            <option value="sync">Sync meetings (Weekly standups)</option>
                            <option value="hybrid">Hybrid</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Invite Collaborators (Pre-launch)</label>
                    <div className="flex gap-2">
                        <input
                            ref={inviteEmailInputRef}
                            type="email"
                            id="invite-email"
                            placeholder="colleague@example.com"
                            className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddInvite();
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => handleAddInvite()}
                            className="px-4 py-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 font-medium text-sm"
                        >
                            Invite
                        </button>
                    </div>

                    {/* List of Invites */}
                    {((watch("metadata")?.invites as string[]) || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {((watch("metadata")?.invites as string[]) || []).map((email) => (
                                <div key={email} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm border border-indigo-100 dark:border-indigo-800">
                                    <Mail className="w-3 h-3" />
                                    <span>{email}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const currentInvites = (watch("metadata")?.invites as string[]) || [];
                                            setValue("metadata", { ...watch("metadata"), invites: currentInvites.filter(e => e !== email) });
                                        }}
                                        className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 ml-1"
                                    >
                                        <span className="sr-only">Remove</span>
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Visibility */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    <Eye className="w-4 h-4 text-indigo-500" />Visibility & Access
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {VISIBILITY_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = visibility === opt.id;
                        return (
                            <button key={opt.id} type="button" onClick={() => setValue("visibility", opt.id as "public" | "unlisted" | "private")} className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? `${opt.borderClass} ${opt.bgClass}` : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg ${isSelected ? opt.iconBgClass : "bg-zinc-100 dark:bg-zinc-800"} flex items-center justify-center`}>
                                        <Icon className={`w-5 h-5 ${isSelected ? opt.iconClass : "text-zinc-400"}`} />
                                    </div>
                                    <div>
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{opt.label}</span>
                                        <p className="text-xs text-zinc-500">{opt.desc}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Application Settings */}
                {visibility !== "private" && (
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Application Settings</p>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={applicationSettings?.allow_applications ?? true} onChange={(e) => updateAppSettings("allow_applications", e.target.checked)} className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">Allow applications</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={applicationSettings?.require_portfolio ?? false} onChange={(e) => updateAppSettings("require_portfolio", e.target.checked)} className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">Require portfolio/resume link</span>
                        </label>
                    </div>
                )}
            </div>

            {/* Terms */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-violet-500" />Terms & Agreements
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">IP / Ownership</label>
                            <div className="group relative">
                                <Info className="w-4 h-4 text-zinc-400 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-zinc-900 text-white text-xs rounded shadow-lg w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    Define who owns the IP (Intellectual Property).
                                </div>
                            </div>
                        </div>
                        <select value={terms?.ip_agreement || "discuss"} onChange={(e) => updateTerms("ip_agreement", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                            {IP_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">NDA Requirement</label>
                            <div className="group relative">
                                <Info className="w-4 h-4 text-zinc-400 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-zinc-900 text-white text-xs rounded shadow-lg w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    Require an NDA before joining?
                                </div>
                            </div>
                        </div>
                        <select value={terms?.nda_required || "none"} onChange={(e) => updateTerms("nda_required", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                            {NDA_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>

                {terms?.ip_agreement === "open_source" && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">License</label>
                        <select value={terms?.license || ""} onChange={(e) => updateTerms("license", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                            <option value="">Select license...</option>
                            {LICENSE_OPTIONS.map((lic) => <option key={lic} value={lic}>{lic}</option>)}
                        </select>
                    </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <input type="checkbox" checked={terms?.portfolio_showcase_allowed ?? true} onChange={(e) => updateTerms("portfolio_showcase_allowed", e.target.checked)} className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Contributors can showcase work in portfolio</span>
                    <div className="group relative ml-2">
                        <Info className="w-4 h-4 text-zinc-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-zinc-900 text-white text-xs rounded shadow-lg w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            Allow displaying this project in portfolios.
                        </div>
                    </div>
                </label>
            </div>

            {/* External Links */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    <ExternalLink className="w-4 h-4 text-blue-500" />External Links
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { key: "discord", label: "Discord", placeholder: "https://discord.gg/..." },
                        { key: "github", label: "GitHub", placeholder: "https://github.com/..." },
                        { key: "website", label: "Website", placeholder: "https://..." },
                        { key: "figma", label: "Figma", placeholder: "https://figma.com/..." },
                    ].map((link) => (
                        <div key={link.key} className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{link.label}</label>
                            <input type="url" value={(externalLinks as any)?.[link.key] || ""} onChange={(e) => updateLinks(link.key, e.target.value)} placeholder={link.placeholder} className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Notifications */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    <Bell className="w-4 h-4 text-amber-500" />Notifications
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
                    <p className="text-sm text-zinc-500 mb-3">Email me when:</p>
                    {[
                        { key: "on_application", label: "Someone applies to the project", icon: Mail },
                        { key: "on_task_complete", label: "A team member completes a task", icon: CheckSquare },
                        { key: "on_chat_message", label: "New chat messages", icon: MessageCircle },
                    ].map((notif) => (
                        <label key={notif.key} className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={(notificationPreferences as any)?.[notif.key] ?? true} onChange={(e) => updateNotifications(notif.key, e.target.checked)} className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500" />
                            <notif.icon className="w-4 h-4 text-zinc-400" />
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">{notif.label}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
