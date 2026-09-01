"use client";

import { X } from "lucide-react";
import { Project } from "./HubClient";

interface ProjectComparisonModalProps {
    projects: Project[];
    onClose: () => void;
}

export default function ProjectComparisonModal({ projects, onClose }: ProjectComparisonModalProps) {
    if (projects.length < 2) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="w-full max-w-6xl h-[80vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Compare Projects</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {/* Comparison Grid */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid gap-8" style={{ gridTemplateColumns: `150px repeat(${projects.length}, minmax(250px, 1fr))` }}>

                        {/* Row Headers */}
                        <div className="space-y-8 pt-20 font-medium text-zinc-500">
                            <div className="h-8 flex items-center">Status</div>
                            <div className="h-8 flex items-center">Type</div>
                            <div className="h-8 flex items-center">Role</div>
                            <div className="h-8 flex items-center">Location</div>
                            <div className="h-8 flex items-center">Timeline</div>
                            <div className="h-auto min-h-[100px] flex items-start pt-2">Description</div>
                            <div className="h-auto min-h-[100px] flex items-start pt-2">Tags</div>
                        </div>

                        {/* Project Columns */}
                        {projects.map(project => (
                            <div key={project.id} className="space-y-8">
                                {/* Project Header */}
                                <div className="h-20 flex flex-col justify-end pb-4 border-b border-zinc-200 dark:border-zinc-800">
                                    <h3 className="font-bold text-lg truncate" title={project.title}>{project.title}</h3>
                                    <p className="text-sm text-zinc-500 truncate">by {project.creator?.full_name || 'Unknown'}</p>
                                </div>

                                {/* Data Rows */}
                                <div className="h-8 flex items-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                    ${project.status === 'active' ? 'bg-green-100 text-green-700' :
                                            project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'}`}>
                                        {project.status}
                                    </span>
                                </div>

                                <div className="h-8 flex items-center capitalize">{project.custom_project_type || project.project_type}</div>

                                <div className="h-8 flex items-center capitalize">{project.role || 'Owner'}</div>

                                <div className="h-8 flex items-center text-zinc-600 dark:text-zinc-400">
                                    {project.location || <span className="text-zinc-300 italic">Remote</span>}
                                </div>

                                <div className="h-8 flex items-center text-sm">
                                    {project.start_date ? (
                                        <span>{new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}</span>
                                    ) : (
                                        <span className="text-zinc-300 italic">Not specified</span>
                                    )}
                                </div>

                                <div className="h-auto min-h-[100px] text-sm text-zinc-600 dark:text-zinc-400">
                                    {project.description}
                                </div>

                                <div className="h-auto min-h-[100px] flex flex-wrap content-start gap-2">
                                    {project.tags && project.tags.length > 0 ? (
                                        project.tags.map((tag: string) => (
                                            <span key={tag} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">#{tag}</span>
                                        ))
                                    ) : (
                                        <span className="text-zinc-300 italic text-sm">No tags</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
