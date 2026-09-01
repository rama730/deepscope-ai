"use client";

import { Clock, Target, Users, Calendar, Lightbulb, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface HealthTileProps {
    project: any;
}

export default function HealthTile({ project }: HealthTileProps) {
    // Calculate "Completeness" for the health bar
    const calculateStrength = () => {
        const checks = [
            !!project.description,
            !!project.short_description,
            (project.technologies_used?.length || 0) > 0,
            (project.goals?.length || 0) > 0,
            project.visibility === 'public',
            !!project.problem_statement,
            !!project.solution_overview,
        ];
        const trueCount = checks.filter(Boolean).length;
        return Math.round((trueCount / checks.length) * 100);
    };

    const strength = calculateStrength();
    const goals = project.goals || [];

    // Format dates safely
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "TBD";
        try {
            return format(new Date(dateStr), "MMM yyyy");
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="h-full bg-white dark:bg-[#0d1117] rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Project Overview
                </h3>
                <div className="flex items-center gap-2" title={`${strength}% Information Complete`}>
                    <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${strength > 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${strength}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500">{strength}%</span>
                </div>
            </div>

            <div className="p-5 flex-1 space-y-6">

                {/* Vision Section: Problem & Solution */}
                {(project.problem_statement || project.solution_overview) && (
                    <div className="space-y-4">
                        {project.problem_statement && (
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">The Problem</h4>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed italic border-l-2 border-amber-500/50 pl-3">
                                    "{project.problem_statement}"
                                </p>
                            </div>
                        )}
                        {project.solution_overview && (
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">The Solution</h4>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                    {project.solution_overview}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Key Info Grid: Audience & Timeline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {(project.target_audience) && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                            <Users className="w-4 h-4 text-blue-500 mt-0.5" />
                            <div>
                                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Target Audience</div>
                                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2" title={project.target_audience}>
                                    {project.target_audience}
                                </div>
                            </div>
                        </div>
                    )}

                    {(project.expected_start_date || project.expected_end_date) && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                            <Calendar className="w-4 h-4 text-purple-500 mt-0.5" />
                            <div>
                                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Timeline</div>
                                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                    {formatDate(project.expected_start_date)} <span className="text-zinc-300 mx-1">→</span> {formatDate(project.expected_end_date)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Goals */}
                {goals.length > 0 && (
                    <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-2 mb-3 mt-4">
                            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Key Objectives</h4>
                        </div>
                        <ul className="space-y-2.5">
                            {goals.slice(0, 5).map((goal: string, i: number) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300 group">
                                    <div className="mt-1 w-4 h-4 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                    </div>
                                    <span className="leading-snug">{goal}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last updated recently</span>
                </div>
                {/* Optional: Read More link if content is truncated could go here, for now hidden */}
            </div>
        </div>
    );
}
