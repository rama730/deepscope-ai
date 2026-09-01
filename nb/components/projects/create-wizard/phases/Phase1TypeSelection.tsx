"use client";

import { useState, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
    Rocket,
    FlaskConical,
    Trophy,
    GraduationCap,
    Briefcase,
    Code,
    Users,
    Lightbulb,
    Gamepad2,
    Smartphone,
    Globe,
    Brain,
    Heart,
    ShoppingCart,
    Video,
    Calendar,
    Plus,
    Search,
    Check,
    Clock,
    Filter,
    Target,
} from "lucide-react";
import type { CreateProjectInput } from "@/lib/validations/project";

interface ProjectTemplate {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    hoverBorderColor: string;
    stages: string[];
    duration: string;
    difficulty: "Easy" | "Medium" | "Hard";
    popular?: boolean;
    category: "popular" | "academic" | "development" | "creative" | "business" | "other";
    goals: string[];
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
    // Popular
    {
        id: "startup",
        title: "Startup MVP",
        description: "Build and validate a minimum viable product for a new business idea",
        icon: Rocket,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800",
        hoverBorderColor: "hover:border-blue-400 dark:hover:border-blue-600",
        stages: ["Ideation", "MVP Development", "Testing & Validation", "Launch"],
        duration: "2-4 months",
        difficulty: "Hard",
        popular: true,
        category: "popular",
        goals: ["Define Value Proposition", "Build MVP Core Features", "User Testing with 10 Users", "Launch on Product Hunt", "Secure First Paying Customer"],
    },
    {
        id: "hackathon",
        title: "Hackathon Entry",
        description: "Create a functional prototype for a competition in a short timeframe",
        icon: Trophy,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        borderColor: "border-amber-200 dark:border-amber-800",
        hoverBorderColor: "hover:border-amber-400 dark:hover:border-amber-600",
        stages: ["Brainstorming", "Rapid Prototyping", "Demo Preparation", "Presentation"],
        duration: "24-48 hours",
        difficulty: "Medium",
        popular: true,
        category: "popular",
        goals: ["Ideate Solution", "Build Functional Prototype", "Create Demo Video", "Submit Project", "Pitch to Judges"],
    },
    {
        id: "portfolio",
        title: "Portfolio Project",
        description: "Develop a project to showcase your skills and build your professional portfolio",
        icon: Briefcase,
        color: "text-violet-600 dark:text-violet-400",
        bgColor: "bg-violet-50 dark:bg-violet-950/30",
        borderColor: "border-violet-200 dark:border-violet-800",
        hoverBorderColor: "hover:border-violet-400 dark:hover:border-violet-600",
        stages: ["Planning", "Development", "Polish & Documentation", "Showcase"],
        duration: "1-3 months",
        difficulty: "Medium",
        popular: true,
        category: "popular",
        goals: ["Define Core Skills to Showcase", "Develop Key Feature Set", "Write Technical Documentation", "Deploy to Production", "Share on LinkedIn/Resume"],
    },
    // Academic & Research
    {
        id: "research",
        title: "Research Study",
        description: "Conduct an academic or scientific study to investigate a hypothesis",
        icon: FlaskConical,
        color: "text-teal-600 dark:text-teal-400",
        bgColor: "bg-teal-50 dark:bg-teal-950/30",
        borderColor: "border-teal-200 dark:border-teal-800",
        hoverBorderColor: "hover:border-teal-400 dark:hover:border-teal-600",
        stages: ["Literature Review", "Methodology Design", "Data Collection", "Analysis & Publication"],
        duration: "3-6 months",
        difficulty: "Hard",
        category: "academic",
        goals: ["Formulate Hypothesis", "Design Methodology", "Collect Data", "Analyze Results", "Publish Findings"],
    },
    {
        id: "course",
        title: "Course Project",
        description: "Complete an assignment or final project for an educational course",
        icon: GraduationCap,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        borderColor: "border-emerald-200 dark:border-emerald-800",
        hoverBorderColor: "hover:border-emerald-400 dark:hover:border-emerald-600",
        stages: ["Requirements Analysis", "Implementation", "Testing", "Submission"],
        duration: "2-8 weeks",
        difficulty: "Easy",
        category: "academic",
        goals: ["Understand Requirements", "Plan Architecture", "Implement Core Logic", "Write Test Cases", "Submit Assignment"],
    },
    // Development
    {
        id: "open_source",
        title: "Open Source",
        description: "Contribute to or create a new open source project for the community",
        icon: Code,
        color: "text-slate-600 dark:text-slate-400",
        bgColor: "bg-slate-50 dark:bg-slate-900/50",
        borderColor: "border-slate-200 dark:border-slate-700",
        hoverBorderColor: "hover:border-slate-400 dark:hover:border-slate-500",
        stages: ["Project Setup", "Development", "Documentation", "Community Release"],
        duration: "Ongoing",
        difficulty: "Medium",
        category: "development",
        goals: ["Setup Repository", "Create Contribution Guidelines", "Implement MVP", "Write Documentation", "Publish to Package Registry"],
    },
    {
        id: "saas",
        title: "SaaS Product",
        description: "Build a subscription-based software-as-a-service product",
        icon: Globe,
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
        borderColor: "border-indigo-200 dark:border-indigo-800",
        hoverBorderColor: "hover:border-indigo-400 dark:hover:border-indigo-600",
        stages: ["Discovery", "MVP Build", "Beta Launch", "Growth"],
        duration: "3-6 months",
        difficulty: "Hard",
        category: "development",
        goals: ["Market Research", "Build MVP", "Setup Billing/Auth", "Launch Beta", "Acquire 100 Users"],
    },
    {
        id: "mobile_app",
        title: "Mobile App",
        description: "Create a mobile application for iOS, Android, or cross-platform",
        icon: Smartphone,
        color: "text-pink-600 dark:text-pink-400",
        bgColor: "bg-pink-50 dark:bg-pink-950/30",
        borderColor: "border-pink-200 dark:border-pink-800",
        hoverBorderColor: "hover:border-pink-400 dark:hover:border-pink-600",
        stages: ["Design", "Development", "Testing", "App Store Launch"],
        duration: "2-4 months",
        difficulty: "Medium",
        category: "development",
        goals: ["UI/UX Design", "Develop Core Features", "Test on Devices", "App Store Submission", "Marketing Launch"],
    },
    {
        id: "ai_ml",
        title: "AI/ML Project",
        description: "Build a machine learning model or AI-powered application",
        icon: Brain,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-50 dark:bg-purple-950/30",
        borderColor: "border-purple-200 dark:border-purple-800",
        hoverBorderColor: "hover:border-purple-400 dark:hover:border-purple-600",
        stages: ["Research", "Data Preparation", "Model Training", "Deployment"],
        duration: "2-6 months",
        difficulty: "Hard",
        category: "development",
        goals: ["Data Collection & Cleaning", "Model Selection", "Train & Validate Model", "Deploy Inference API", "Build Frontend Interface"],
    },
    // Creative
    {
        id: "game",
        title: "Game Development",
        description: "Create a video game from concept to playable experience",
        icon: Gamepad2,
        color: "text-rose-600 dark:text-rose-400",
        bgColor: "bg-rose-50 dark:bg-rose-950/30",
        borderColor: "border-rose-200 dark:border-rose-800",
        hoverBorderColor: "hover:border-rose-400 dark:hover:border-rose-600",
        stages: ["Game Design", "Core Mechanics", "Art & Audio", "Polish & Release"],
        duration: "3-12 months",
        difficulty: "Hard",
        category: "creative",
        goals: ["Game Design Document", "Core Mechanics Prototype", "Create Assets", "Level Design", "Release Demo"],
    },
    {
        id: "content_creator",
        title: "Content Creation",
        description: "Launch a YouTube channel, podcast, blog, or other content platform",
        icon: Video,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800",
        hoverBorderColor: "hover:border-red-400 dark:hover:border-red-600",
        stages: ["Planning", "Content Production", "Publishing", "Growth"],
        duration: "Ongoing",
        difficulty: "Medium",
        category: "creative",
        goals: ["Content Strategy", "Create Initial Content", "Setup Channels", "Launch & Promote", "Analyze Metrics"],
    },
    // Business
    {
        id: "client_project",
        title: "Client Project",
        description: "Work on a project for a client or customer with specific requirements",
        icon: Users,
        color: "text-cyan-600 dark:text-cyan-400",
        bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
        borderColor: "border-cyan-200 dark:border-cyan-800",
        hoverBorderColor: "hover:border-cyan-400 dark:hover:border-cyan-600",
        stages: ["Client Briefing", "Design & Planning", "Development", "Client Review & Delivery"],
        duration: "1-6 months",
        difficulty: "Hard",
        category: "business",
        goals: ["Requirement Gathering", "Design Approval", "Development Phase", "UAT (User Acceptance Testing)", "Final Delivery"],
    },
    {
        id: "ecommerce",
        title: "E-commerce Store",
        description: "Build an online store or marketplace for selling products",
        icon: ShoppingCart,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800",
        hoverBorderColor: "hover:border-green-400 dark:hover:border-green-600",
        stages: ["Product Setup", "Store Design", "Payments Integration", "Launch & Marketing"],
        duration: "1-3 months",
        difficulty: "Medium",
        category: "business",
        goals: ["Product Sourcing", "Store Setup", "Payment Gateway Integration", "Test Checkout Flow", "Launch Marketing Campaign"],
    },
    {
        id: "nonprofit",
        title: "Non-Profit / Social Good",
        description: "Create an impact-focused project for social change or community benefit",
        icon: Heart,
        color: "text-pink-600 dark:text-pink-400",
        bgColor: "bg-pink-50 dark:bg-pink-950/30",
        borderColor: "border-pink-200 dark:border-pink-800",
        hoverBorderColor: "hover:border-pink-400 dark:hover:border-pink-600",
        stages: ["Problem Research", "Solution Design", "Implementation", "Impact Measurement"],
        duration: "2-6 months",
        difficulty: "Medium",
        category: "business",
        goals: ["Identify Needs", "Design Solution", "Implement Project", "Measure Impact", "Report to Stakeholders"],
    },
    // Other
    {
        id: "skill_development",
        title: "Skill Development",
        description: "Learn new technologies through hands-on practice and building",
        icon: Lightbulb,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-950/30",
        borderColor: "border-orange-200 dark:border-orange-800",
        hoverBorderColor: "hover:border-orange-400 dark:hover:border-orange-600",
        stages: ["Learning Goals", "Practice & Build", "Apply Skills", "Portfolio Addition"],
        duration: "Flexible",
        difficulty: "Easy",
        category: "other",
        goals: ["Identify Learning Resources", "Practice Exercises", "Build Mini-Project", "Review Code", "Document Learning"],
    },
    {
        id: "event",
        title: "Event / Hackathon Host",
        description: "Organize and host an event, hackathon, or community gathering",
        icon: Calendar,
        color: "text-fuchsia-600 dark:text-fuchsia-400",
        bgColor: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
        borderColor: "border-fuchsia-200 dark:border-fuchsia-800",
        hoverBorderColor: "hover:border-fuchsia-400 dark:hover:border-fuchsia-600",
        stages: ["Planning", "Promotion", "Execution", "Wrap-up"],
        duration: "1-3 months",
        difficulty: "Medium",
        category: "other",
        goals: ["Define Event Scope", "Secure Venue/Platform", "Promote Event", "Manage Registrations", "Host Event"],
    },
    {
        id: "other",
        title: "Custom Project",
        description: "Define your own project type with custom goals and lifecycle",
        icon: Plus,
        color: "text-zinc-600 dark:text-zinc-400",
        bgColor: "bg-zinc-50 dark:bg-zinc-900/50",
        borderColor: "border-zinc-200 dark:border-zinc-700",
        hoverBorderColor: "hover:border-zinc-400 dark:hover:border-zinc-500",
        stages: ["Planning", "Execution", "Review", "Completion"],
        duration: "Custom",
        difficulty: "Medium",
        category: "other",
        goals: [],
    },
];

const CATEGORIES = [
    { id: "all", label: "All Templates" },
    { id: "popular", label: "Popular" },
    { id: "academic", label: "Academic" },
    { id: "development", label: "Development" },
    { id: "creative", label: "Creative" },
    { id: "business", label: "Business" },
    { id: "other", label: "Other" },
];

export default function Phase1TypeSelection() {
    const { setValue, watch } = useFormContext<CreateProjectInput>();
    const selectedType = watch("project_type");
    const customType = watch("custom_project_type");

    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

    const filteredTemplates = useMemo(() => {
        let templates = PROJECT_TEMPLATES;

        if (activeCategory !== "all") {
            templates = templates.filter((t) => t.category === activeCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            templates = templates.filter(
                (t) =>
                    t.title.toLowerCase().includes(query) ||
                    t.description.toLowerCase().includes(query)
            );
        }

        return templates;
    }, [searchQuery, activeCategory]);

    const selectedTemplate = useMemo(
        () => PROJECT_TEMPLATES.find((t) => t.id === selectedType),
        [selectedType]
    );

    const handleSelectTemplate = (templateId: string) => {
        const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
        setValue("project_type", templateId);
        if (template) {
            setValue("lifecycle_stages", template.stages);
            setValue("goals", template.goals); // Preset goals
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Filter Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
                <div className="text-center sm:text-left">
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        What are you building?
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Choose a template to get started
                    </p>
                </div>

                <motion.button
                    type="button"
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2 rounded-xl transition-colors ${isFiltersExpanded
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                >
                    <Filter className="w-5 h-5" />
                </motion.button>
            </div>

            {/* Expandable Search & Filter */}
            <AnimatePresence>
                {isFiltersExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col sm:flex-row gap-4 py-1">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search templates..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            {/* Category Filter */}
                            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.id
                                            ? "bg-indigo-600 text-white shadow-sm"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => {
                    const Icon = template.icon;
                    const isSelected = selectedType === template.id;

                    return (
                        <motion.button
                            key={template.id}
                            type="button"
                            onClick={() => handleSelectTemplate(template.id)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-xl border-2 text-left transition-all ${isSelected
                                ? `${template.borderColor} ${template.bgColor} ring-2 ring-indigo-500/20`
                                : `border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 ${template.hoverBorderColor}`
                                }`}
                        >
                            {/* Selected Checkmark */}
                            {isSelected && (
                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}

                            {/* Icon */}
                            <div
                                className={`w-10 h-10 rounded-lg ${template.bgColor} flex items-center justify-center mb-3`}
                            >
                                <Icon className={`w-5 h-5 ${template.color}`} />
                            </div>

                            {/* Content */}
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                                {template.title}
                            </h4>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
                                {template.description}
                            </p>

                            {/* Meta */}
                            <div className="flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                    <Clock className="w-3 h-3" />
                                    {template.duration}
                                </span>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Selected Template Preview */}
            <AnimatePresence>
                {selectedTemplate && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className={`rounded-xl border-2 ${selectedTemplate.borderColor} ${selectedTemplate.bgColor} overflow-hidden`}
                    >
                        <div className="p-5">
                            <div className="flex items-start gap-4">
                                <div
                                    className={`w-12 h-12 rounded-xl ${selectedTemplate.bgColor} border ${selectedTemplate.borderColor} flex items-center justify-center flex-shrink-0`}
                                >
                                    <selectedTemplate.icon className={`w-6 h-6 ${selectedTemplate.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                                            {selectedTemplate.title}
                                        </h4>
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                        {selectedTemplate.description}
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Stages Preview */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                                                Project Stages
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedTemplate.stages.map((stage, idx) => (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        key={`${stage}-${idx}`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-700/50"
                                                    >
                                                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                                            {stage}
                                                        </span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Goals Preview - NEW SECTION */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                                                Core Goals
                                            </p>
                                            <div className="flex flex-col gap-2">
                                                {selectedTemplate.goals.map((goal, idx) => (
                                                    <div key={`${goal}-${idx}`} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                                        <Target className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                                        <span>{goal}</span>
                                                    </div>
                                                ))}
                                                {selectedTemplate.goals.length === 0 && (
                                                    <span className="text-sm text-zinc-400 italic">No specific preset goals</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Duration */}
                                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50">
                                        <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                                            <Clock className="w-4 h-4" />
                                            <span>Typical Duration: {selectedTemplate.duration}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Type Input */}
            <AnimatePresence>
                {selectedType === "other" && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                    >
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 pt-2">
                            Custom Project Type <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={customType || ""}
                            onChange={(e) => setValue("custom_project_type", e.target.value)}
                            placeholder="e.g., Mobile Game, Chrome Extension, CLI Tool"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
