import { useState, useEffect } from "react";
import { Filter, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS, PROJECT_TYPE, SORT_OPTIONS, ProjectStatus, ProjectType, SortOption } from "@/constants/hub";

interface UnifiedFilterMenuProps {
    filters: {
        status: ProjectStatus;
        type: ProjectType;
        tech: string[];
        sort: SortOption;
    };
    onApply: (newFilters: { status: ProjectStatus, type: ProjectType, sort: SortOption, tech: string[] }) => void;
}

// Common tech stack options
const TECH_STACKS = [
    "React", "Next.js", "TypeScript", "Node.js", "Python", "TailwindCSS",
    "Supabase", "PostgreSQL", "Firebase", "AWS", "Docker", "Kubernetes",
    "Vue", "Angular", "Svelte", "Go", "Rust", "Java", "Flutter", "React Native"
];

function FilterSection<T extends string | number | null>({
    title,
    options,
    currentValue,
    onChange
}: {
    title: string;
    options: { label: string; value: T }[];
    currentValue: T;
    onChange: (val: T) => void;
}) {
    return (
        <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{title}</h3>
            <div className="flex flex-wrap gap-1.5" role="radiogroup">
                {options.map((option) => (
                    <button
                        key={String(option.value)}
                        type="button"
                        role="radio"
                        aria-checked={currentValue === option.value}
                        aria-label={`${title}: ${option.label}`}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "px-2.5 py-1 rounded-md text-xs border transition-all",
                            currentValue === option.value
                                ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900 font-medium shadow-sm"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </section>
    );
}

export default function UnifiedFilterMenu({
    filters,
    onApply
}: UnifiedFilterMenuProps) {
    const [open, setOpen] = useState(false);

    // Local State
    const [localStatus, setLocalStatus] = useState<ProjectStatus>(filters.status);
    const [localType, setLocalType] = useState<ProjectType>(filters.type);
    const [localSort, setLocalSort] = useState<SortOption>(filters.sort);
    const [localTech, setLocalTech] = useState<string[]>(filters.tech);

    // Sync local state when menu opens
    useEffect(() => {
        if (open) {
            setLocalStatus(filters.status);
            setLocalType(filters.type);
            setLocalSort(filters.sort);
            setLocalTech(filters.tech);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Handlers
    const handleReset = () => {
        setLocalStatus(PROJECT_STATUS.ALL);
        setLocalType(PROJECT_TYPE.ALL);
        setLocalSort(SORT_OPTIONS.NEWEST);
        setLocalTech([]);
    };

    const handleApply = () => {
        onApply({
            status: localStatus,
            type: localType,
            sort: localSort,
            tech: localTech
        });
        setOpen(false);
    };

    const toggleTech = (tech: string) => {
        setLocalTech(prev =>
            prev.includes(tech)
                ? prev.filter(t => t !== tech)
                : [...prev, tech]
        );
    };

    // Configuration
    const statusOptions = [
        { label: "All Status", value: PROJECT_STATUS.ALL },
        { label: "Idea", value: PROJECT_STATUS.IDEA },
        { label: "In Progress", value: PROJECT_STATUS.IN_PROGRESS },
        { label: "Launched", value: PROJECT_STATUS.LAUNCHED },
    ];

    const typeOptions = [
        { label: "All Types", value: PROJECT_TYPE.ALL },
        { label: "Web App", value: PROJECT_TYPE.WEB_APP },
        { label: "Mobile App", value: PROJECT_TYPE.MOBILE_APP },
        { label: "Library", value: PROJECT_TYPE.LIBRARY },
        { label: "Other", value: PROJECT_TYPE.OTHER },
    ];

    const sortOptions = [
        { label: "Newest", value: SORT_OPTIONS.NEWEST },
        { label: "Popular", value: SORT_OPTIONS.POPULAR },
        { label: "Recently Active", value: SORT_OPTIONS.RECENT_ACTIVITY },
        { label: "Most Followers", value: SORT_OPTIONS.MOST_FOLLOWERS },
    ];

    const activeFilterCount =
        (filters.status !== PROJECT_STATUS.ALL ? 1 : 0) +
        (filters.type !== PROJECT_TYPE.ALL ? 1 : 0) +
        (filters.tech.length) +
        (filters.sort !== SORT_OPTIONS.NEWEST ? 1 : 0);



    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "h-10 gap-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all",
                        activeFilterCount > 0 && "border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-50 dark:bg-zinc-900 dark:text-zinc-50"
                    )}
                >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 min-w-[20px] justify-center bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] p-0 overflow-hidden rounded-xl border-zinc-200 dark:border-zinc-800 shadow-xl ml-4">
                <div className="flex flex-col h-full max-h-[85vh]">

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white dark:bg-zinc-950">
                        {/* Sort */}
                        <FilterSection
                            title="Sort By"
                            options={sortOptions}
                            currentValue={localSort}
                            onChange={setLocalSort}
                        />

                        <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                        {/* Status */}
                        <FilterSection
                            title="Project Status"
                            options={statusOptions}
                            currentValue={localStatus}
                            onChange={setLocalStatus}
                        />

                        {/* Type */}
                        <FilterSection
                            title="Project Type"
                            options={typeOptions}
                            currentValue={localType}
                            onChange={setLocalType}
                        />

                        <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                        {/* Technologies */}
                        <section>
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Technologies</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {TECH_STACKS.map((tech) => (
                                    <button
                                        key={tech}
                                        type="button"
                                        aria-pressed={localTech.includes(tech)}
                                        aria-label={`${tech} toggle`}
                                        onClick={() => toggleTech(tech)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs border transition-all flex items-center gap-1.5",
                                            localTech.includes(tech)
                                                ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900 font-medium shadow-sm"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                        )}
                                    >
                                        {localTech.includes(tech) && <Check className="w-3 h-3" />}
                                        {tech}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between gap-4">
                        <Button
                            variant="ghost"
                            onClick={handleReset}
                            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset All
                        </Button>
                        <Button
                            onClick={handleApply}
                            className="min-w-[120px] bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            Apply Filters
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
