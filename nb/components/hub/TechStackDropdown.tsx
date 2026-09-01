import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Code2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TechStackDropdownProps {
    selectedTech: string[];
    onToggle: (techId: string) => void;
}

const TECH_STACKS = [
    { id: "react", label: "React", icon: "⚛️" },
    { id: "nextjs", label: "Next.js", icon: "▲" },
    { id: "typescript", label: "TypeScript", icon: "TS" },
    { id: "python", label: "Python", icon: "🐍" },
    { id: "nodejs", label: "Node.js", icon: "🟢" },
    { id: "supabase", label: "Supabase", icon: "⚡" },
    { id: "tailwind", label: "Tailwind", icon: "🎨" },
    { id: "flutter", label: "Flutter", icon: "💙" },
];

export default function TechStackDropdown({ selectedTech, onToggle }: TechStackDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const updatePosition = () => {
                if (buttonRef.current) {
                    const rect = buttonRef.current.getBoundingClientRect();
                    setDropdownPosition({
                        top: rect.bottom + window.scrollY + 8,
                        left: rect.left + window.scrollX
                    });
                }
            };

            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition);

            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition);
            };
        }
        return undefined;
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${selectedTech.length > 0
                    ? "border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    }`}
            >
                <Code2 className="w-4 h-4" />
                <span>{selectedTech.length > 0 ? `Tech Stack (${selectedTech.length})` : "Tech Stack"}</span>
                {selectedTech.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded">
                        {selectedTech.length}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && typeof window !== 'undefined' && dropdownPosition.top > 0 && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="tech-stack-dropdown fixed w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-2 z-[100]"
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`
                        }}
                    >
                        <div className="space-y-1">
                            {TECH_STACKS.map((tech) => {
                                const isSelected = selectedTech.includes(tech.id);
                                return (
                                    <button
                                        key={tech.id}
                                        onClick={() => onToggle(tech.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${isSelected
                                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{tech.icon}</span>
                                            <span>{tech.label}</span>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4" />}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedTech.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                <button
                                    onClick={() => {
                                        TECH_STACKS.forEach(t => {
                                            if (selectedTech.includes(t.id)) onToggle(t.id);
                                        });
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-md transition-colors"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
