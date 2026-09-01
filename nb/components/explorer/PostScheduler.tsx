"use client";

import { useState } from "react";

interface PostSchedulerProps {
    onSchedule: (date: Date) => void;
    onCancel: () => void;
}

export default function PostScheduler({ onSchedule, onCancel }: PostSchedulerProps) {
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    const handleConfirm = () => {
        if (!date || !time) return;
        const scheduledDate = new Date(`${date}T${time}`);
        onSchedule(scheduledDate);
    };

    // Get min date (today)
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-semibold mb-3">Schedule Post</h3>
            <div className="space-y-3">
                <div>
                    <label className="block text-xs text-zinc-500 mb-1">Date</label>
                    <input
                        type="date"
                        min={today}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs text-zinc-500 mb-1">Time</label>
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!date || !time}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
