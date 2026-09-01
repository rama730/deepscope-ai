"use client";

import { useState } from "react";
import { Project } from "@/components/hub/HubClient";
import Link from "next/link";

interface MapViewProps {
    projects: Project[];
}

export default function MapView({ projects }: MapViewProps) {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Mock coordinates for demo if missing
    const getCoordinates = (project: Project, index: number) => {
        if (project.latitude && project.longitude) {
            return { lat: project.latitude, lng: project.longitude };
        }
        // Generate deterministic pseudo-random coords for demo
        // Map range: 0-100%
        const seed = project.id.charCodeAt(0) + index;
        return {
            lat: (seed * 13) % 80 + 10, // 10-90%
            lng: (seed * 7) % 80 + 10  // 10-90%
        };
    };

    return (
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 h-[600px] relative">
            {/* Map Background (Placeholder) */}
            <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center opacity-20 pointer-events-none"></div>

            <div className="absolute inset-0 p-4">
                {projects.map((project, index) => {
                    const coords = getCoordinates(project, index);
                    return (
                        <div
                            key={project.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                            style={{ top: `${coords.lat}%`, left: `${coords.lng}%` }}
                        >
                            <button
                                onClick={() => setSelectedProject(project)}
                                className={`w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 shadow-lg transition-all hover:scale-150 ${selectedProject?.id === project.id ? 'bg-blue-500 scale-125' : 'bg-zinc-500 dark:bg-zinc-400'
                                    }`}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                <div className="font-semibold truncate">{project.title}</div>
                                <div className="text-zinc-500 truncate">{project.location || 'Unknown Location'}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selected Project Card Overlay */}
            {selectedProject && (
                <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 animate-in slide-in-from-bottom-4 fade-in duration-200">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg line-clamp-1">{selectedProject.title}</h3>
                        <button
                            onClick={() => setSelectedProject(null)}
                            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
                        {selectedProject.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {selectedProject.location || 'No location specified'}
                    </div>
                    <Link
                        href={`/project/${selectedProject.id}`}
                        className="block w-full text-center py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        View Project
                    </Link>
                </div>
            )}

            {/* Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
                <button className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
