"use client";

import { useState } from "react";
import { Project } from "@/components/hub/HubClient";
import Link from "next/link";

interface CalendarViewProps {
    projects: Project[];
}

export default function CalendarView({ projects }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Helper to get days in month
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    // Group projects by day
    const projectsByDay: Record<number, Project[]> = {};
    projects.forEach(p => {
        const date = p.start_date ? new Date(p.start_date) : new Date(p.created_at);
        if (date.getFullYear() === year && date.getMonth() === month) {
            const day = date.getDate();
            if (!projectsByDay[day]) projectsByDay[day] = [];
            projectsByDay[day].push(p);
        }
    });

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-lg font-bold">{monthNames[month]} {year}</h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-medium hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg">
                        Today
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr bg-zinc-200 dark:bg-zinc-800 gap-px">
                {/* Empty cells for previous month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`prev-${i}`} className="bg-white dark:bg-zinc-900 min-h-[120px] p-2 opacity-50"></div>
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayProjects = projectsByDay[day] || [];
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                    return (
                        <div key={day} className={`bg-white dark:bg-zinc-900 min-h-[120px] p-2 group hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-colors ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                            <div className={`text-sm font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                {day}
                            </div>
                            <div className="space-y-1">
                                {dayProjects.map(p => (
                                    <Link
                                        key={p.id}
                                        href={`/project/${p.id}`}
                                        className="block text-xs p-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 truncate hover:opacity-80 transition-opacity border-l-2 border-blue-500"
                                        title={p.title}
                                    >
                                        {p.title}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Empty cells for next month to fill grid */}
                {Array.from({ length: (42 - (daysInMonth + firstDayOfMonth)) % 7 }).map((_, i) => (
                    <div key={`next-${i}`} className="bg-white dark:bg-zinc-900 min-h-[120px] p-2 opacity-50"></div>
                ))}
            </div>
        </div>
    );
}
