"use client";

import { useFormContext } from "react-hook-form";
import { Plus, X, Users, Sparkles, Trash2 } from "lucide-react";
import type { CreateProjectInput, OpenRoleInput, CreatorRole } from "@/lib/validations/project";
import type { WizardContextType } from "../useCreateProjectWizard";
import { motion, AnimatePresence } from "framer-motion";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface Props {
    wizardContext: WizardContextType;
}

const COMMON_ROLES = [
    { title: "Frontend Dev", type: "developer" },
    { title: "Backend Dev", type: "developer" },
    { title: "Fullstack", type: "developer" },
    { title: "UI/UX Designer", type: "designer" },
    { title: "Product Manager", type: "manager" },
    { title: "Marketer", type: "marketer" },
];

const COMMON_TITLES = [
    "Lead Developer",
    "Senior Developer",
    "Junior Developer",
    "Frontend Developer",
    "Backend Developer",
    "Fullstack Developer",
    "UI/UX Designer",
    "Product Designer",
    "Product Manager",
    "Project Manager",
    "Tech Lead",
    "Engineering Manager",
    "Founder",
    "Co-Founder",
    "CEO",
    "CTO",
    "CMO",
    "Marketing Manager",
    "Content Creator",
    "DevOps Engineer",
    "QA Engineer",
    "Data Scientist",
    "ML Engineer",
];

const EXPERIENCE_LEVELS = [
    { id: "any", label: "Any Experience" },
    { id: "beginner", label: "Beginner" },
    { id: "intermediate", label: "Intermediate" },
    { id: "advanced", label: "Advanced" },
    { id: "expert", label: "Expert" },
];

const RECOMMENDED_ROLES: Record<string, { role: string; exp: string }[]> = {
    "startup": [{ role: "Co-Founder", exp: "expert" }, { role: "Product Designer", exp: "intermediate" }, { role: "Fullstack Dev", exp: "advanced" }],
    "mobile_app": [{ role: "iOS Developer", exp: "intermediate" }, { role: "Android Developer", exp: "intermediate" }, { role: "UI Designer", exp: "intermediate" }],
    "saas": [{ role: "Backend Developer", exp: "advanced" }, { role: "Frontend Developer", exp: "intermediate" }, { role: "DevOps Engineer", exp: "advanced" }],
    "game": [{ role: "Game Designer", exp: "intermediate" }, { role: "Unity/Unreal Dev", exp: "intermediate" }, { role: "3D Artist", exp: "intermediate" }],
    "ai_ml": [{ role: "ML Engineer", exp: "advanced" }, { role: "Data Scientist", exp: "advanced" }, { role: "Python Dev", exp: "intermediate" }],
    "content_creator": [{ role: "Video Editor", exp: "intermediate" }, { role: "Script Writer", exp: "beginner" }, { role: "Social Media Mgr", exp: "beginner" }],
    "ecommerce": [{ role: "Shopify Dev", exp: "intermediate" }, { role: "Marketing Specialist", exp: "intermediate" }],
    "other": [{ role: "Developer", exp: "any" }, { role: "Designer", exp: "any" }, { role: "Marketer", exp: "any" }],
};

export default function Phase3TeamRoles({ wizardContext }: Props) {
    const { setValue, watch } = useFormContext<CreateProjectInput>();
    const creatorRole = watch("creator_role");
    const projectType = watch("project_type");
    const { openRoles, setOpenRoles, addRole: addRoleContext, removeRole: removeRoleContext } = wizardContext;

    const updateCreatorRole = <K extends keyof CreatorRole>(field: K, value: CreatorRole[K]) => {
        // Handle initialization if role is null
        const currentRole = creatorRole || {
            title: "",
            role_type: "member",
            skills: [],
            description: ""
        };

        const updated: CreatorRole = { ...currentRole, [field]: value };
        setValue("creator_role", updated);
    };

    const handleQuickAddRole = (title: string, type: string) => {
        const updated: CreatorRole = {
            ...(creatorRole || { skills: [] }),
            title,
            role_type: type
        };
        setValue("creator_role", updated);
    };

    const updateRole = (index: number, updates: Partial<OpenRoleInput>) => {
        const newRoles = [...openRoles];
        // Cast the merged object to OpenRoleInput to satisfy TS
        newRoles[index] = { ...newRoles[index], ...updates } as OpenRoleInput;
        setOpenRoles(newRoles);
    };

    const handleAddOpenRole = () => {
        addRoleContext();
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">Build Your Dream Team</h3>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                    Start by defining your role, then list the positions you need to fill to bring your project to life.
                </p>
            </div>

            {/* Creator Role Card */}
            <Card className="border-indigo-100 dark:border-indigo-900/50 shadow-md">
                <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/50 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shadow-sm">
                            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-indigo-950 dark:text-indigo-100">Your Role (Creator)</CardTitle>
                            <CardDescription className="text-indigo-900/60 dark:text-indigo-200/60">
                                How will you contribute to this project?
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Title Field */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Your Title</Label>
                            <p className="text-xs text-muted-foreground">e.g., Lead, Creator, Co-Founder, Tech Lead</p>
                            <div className="flex gap-2">
                                <Input
                                    value={creatorRole?.title || ""}
                                    onChange={(e) => {
                                        updateCreatorRole("title", e.target.value);
                                        if (!creatorRole?.role_type) updateCreatorRole("role_type", "member");
                                    }}
                                    placeholder="e.g. Lead Developer"
                                    className="flex-1"
                                />
                                <Select
                                    onValueChange={(val) => {
                                        const role = COMMON_ROLES.find(r => r.title === val);
                                        if (role) {
                                            handleQuickAddRole(role.title, role.type);
                                        } else {
                                            updateCreatorRole("title", val);
                                            if (!creatorRole?.role_type) updateCreatorRole("role_type", "member");
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-[40px] px-0 flex justify-center">
                                        <span className="sr-only">Select Title</span>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Common Titles</SelectLabel>
                                            {COMMON_TITLES.map((title) => (
                                                <SelectItem key={title} value={title}>
                                                    {title}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Skills Field */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Skills & Technologies</Label>
                            <p className="text-xs text-muted-foreground">What will you be working with actively?</p>
                            <div className="min-h-[42px] p-2 rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-primary flex flex-wrap gap-2">
                                {(creatorRole?.skills || []).map((skill, idx) => (
                                    <Badge key={idx} variant="secondary" className="gap-1 pr-1.5 h-7">
                                        {skill}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updatedSkills = (creatorRole?.skills || []).filter((_, i) => i !== idx);
                                                updateCreatorRole("skills", updatedSkills);
                                            }}
                                            className="hover:bg-muted rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                                <input
                                    type="text"
                                    placeholder={creatorRole?.skills?.length ? "" : "Add skill (e.g. React)..."}
                                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] h-7"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === ",") {
                                            e.preventDefault();
                                            const value = e.currentTarget.value.trim();
                                            if (value && !(creatorRole?.skills || []).includes(value)) {
                                                updateCreatorRole("skills", [...(creatorRole?.skills || []), value]);
                                                e.currentTarget.value = "";
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Role Description <span className="text-muted-foreground font-normal text-xs">(Optional)</span></Label>
                        <Textarea
                            value={creatorRole?.description || ""}
                            onChange={(e) => updateCreatorRole("description", e.target.value)}
                            placeholder="Describe your role and responsibilities in this project..."
                            className="min-h-[100px] resize-none"
                            maxLength={500}
                        />
                        <p className="text-xs text-right text-muted-foreground">
                            {(creatorRole?.description || "").length}/500
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Smart Recommendations */}
            <div className="py-2">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h4 className="font-medium text-sm text-muted-foreground">
                        Recommended roles for <span className="text-foreground font-semibold">{projectType.replace("_", " ")}</span>
                    </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(RECOMMENDED_ROLES[projectType] || RECOMMENDED_ROLES["other"] || []).filter(r => !openRoles.some(or => or.role === r.role)).map(rec => (
                        <Button
                            key={rec.role}
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => {
                                const experienceLevel = (["any", "beginner", "intermediate", "advanced", "expert"].includes(rec.exp)
                                    ? rec.exp
                                    : "any") as "any" | "beginner" | "intermediate" | "advanced" | "expert";
                                const newRole: OpenRoleInput = {
                                    role: rec.role,
                                    count: 1,
                                    experience_level: experienceLevel,
                                    compensation_type: "unpaid",
                                    skills: [],
                                    description: ""
                                };
                                setOpenRoles([newRole, ...openRoles]);
                            }}
                            className="h-8 border-dashed border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            {rec.role}
                        </Button>
                    ))}
                    {(RECOMMENDED_ROLES[projectType] || []).filter(r => !openRoles.some(or => or.role === r.role)).length === 0 && (
                        <span className="text-xs text-muted-foreground italic px-2">All top recommendations added!</span>
                    )}
                </div>
            </div>

            <Separator />

            {/* Open Roles Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xl font-bold text-foreground">Open Positions</h4>
                        <p className="text-sm text-muted-foreground">Who else do you need on your team?</p>
                    </div>
                    <Button onClick={handleAddOpenRole} className="shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Add Role
                    </Button>
                </div>

                <div className="space-y-4">
                    <AnimatePresence initial={false}>
                        {openRoles.map((role, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="relative group border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="absolute right-3 top-3 z-10">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeRoleContext(index)}
                                            className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                            title="Remove role"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex items-start gap-4">
                                            {/* Role Number Badge */}
                                            <div className="flex-shrink-0 mt-2">
                                                <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-500">
                                                    {openRoles.length - index}
                                                </div>
                                            </div>

                                            <div className="flex-1 space-y-6">
                                                {/* Top Row: Title, Count, Experience */}
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                                    {/* Title */}
                                                    <div className="md:col-span-6 space-y-1.5">
                                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position Title</Label>
                                                        <div className="flex gap-2 relative">
                                                            <Input
                                                                value={role.role}
                                                                onChange={(e) => updateRole(index, { role: e.target.value })}
                                                                placeholder="e.g. Senior Product Designer"
                                                                className="flex-1 font-medium bg-transparent"
                                                            />
                                                            <Select
                                                                onValueChange={(val) => updateRole(index, { role: val })}
                                                            >
                                                                <SelectTrigger className="w-[36px] px-0 flex justify-center text-muted-foreground hover:text-foreground transition-colors bg-transparent border-input/50">
                                                                    <span className="sr-only">Quick Select</span>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectGroup>
                                                                        <SelectLabel>Common Roles</SelectLabel>
                                                                        {COMMON_ROLES.map((r) => (
                                                                            <SelectItem key={r.title} value={r.title}>{r.title}</SelectItem>
                                                                        ))}
                                                                    </SelectGroup>
                                                                    <SelectGroup>
                                                                        <SelectLabel>Other Titles</SelectLabel>
                                                                        {COMMON_TITLES.filter(t => !COMMON_ROLES.some(r => r.title === t)).map((title) => (
                                                                            <SelectItem key={title} value={title}>{title}</SelectItem>
                                                                        ))}
                                                                    </SelectGroup>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>

                                                    {/* Count */}
                                                    <div className="md:col-span-2 space-y-1.5">
                                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Count</Label>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={99}
                                                            value={role.count}
                                                            onChange={(e) => updateRole(index, { count: parseInt(e.target.value) || 1 })}
                                                            className="text-center font-medium"
                                                        />
                                                    </div>

                                                    {/* Experience */}
                                                    <div className="md:col-span-4 space-y-1.5">
                                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Experience</Label>
                                                        <Select
                                                            value={role.experience_level}
                                                            onValueChange={(val: any) => updateRole(index, { experience_level: val })}
                                                        >
                                                            <SelectTrigger className="font-medium">
                                                                <SelectValue placeholder="Select level" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {EXPERIENCE_LEVELS.map(ex => (
                                                                    <SelectItem key={ex.id} value={ex.id}>{ex.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                {/* Second Row: Skills */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required Skills</Label>
                                                    <div className="min-h-[44px] p-2 rounded-lg border border-input/50 bg-zinc-50/50 dark:bg-zinc-900/50 focus-within:ring-2 focus-within:ring-ring focus-within:border-primary flex flex-wrap gap-2 transition-all">
                                                        {(role.skills || []).map((skill, skillIdx) => (
                                                            <Badge
                                                                key={skillIdx}
                                                                variant="secondary"
                                                                className="animate-in fade-in zoom-in duration-200 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm gap-1 px-2.5 py-1"
                                                            >
                                                                {skill}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updatedSkills = (role.skills || []).filter((_, i) => i !== skillIdx);
                                                                        updateRole(index, { skills: updatedSkills });
                                                                    }}
                                                                    className="text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 rounded-full p-0.5 ml-1 transition-colors"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </Badge>
                                                        ))}
                                                        <input
                                                            type="text"
                                                            placeholder={(role.skills?.length || 0) === 0 ? "Add specific skills (e.g. React, Node.js)..." : "Add more..."}
                                                            className="flex-1 bg-transparent border-none outline-none text-sm min-w-[140px] h-7 px-1 text-foreground placeholder:text-muted-foreground/60"
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" || e.key === ",") {
                                                                    e.preventDefault();
                                                                    const value = e.currentTarget.value.trim();
                                                                    if (value && !(role.skills || []).includes(value)) {
                                                                        updateRole(index, { skills: [...(role.skills || []), value] });
                                                                        e.currentTarget.value = "";
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Third Row: Description */}
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-baseline">
                                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                                                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                                                            {(role.description || "").length}/500
                                                        </span>
                                                    </div>
                                                    <Textarea
                                                        value={role.description || ""}
                                                        onChange={(e) => updateRole(index, { description: e.target.value })}
                                                        placeholder="Describe the main responsibilities and what you're looking for in this role..."
                                                        rows={2}
                                                        className="min-h-[80px] resize-none text-sm bg-transparent"
                                                        maxLength={500}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>

                                    {/* Bottom border gradient for active/hover state visual */}
                                    <div className="h-0.5 bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover:via-indigo-500/50 transition-all duration-500" />
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {openRoles.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-all duration-300 group cursor-pointer"
                            onClick={handleAddOpenRole}
                        >
                            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/50 transition-all duration-300">
                                <Users className="w-8 h-8 text-indigo-400 dark:text-indigo-400/80 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors" />
                            </div>
                            <h4 className="text-lg font-semibold text-foreground mb-2">No open positions yet</h4>
                            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                                Start building your dream team by defining the roles you need for this project.
                            </p>
                            <Button className="shadow-lg hover:shadow-indigo-500/25 transition-all duration-300">
                                <Plus className="w-4 h-4 mr-2" /> Add Your First Role
                            </Button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
