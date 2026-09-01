"use client";

import { useMemo } from "react";
import { TrendingDown } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  created_at: string;
  completed_at: string | null;
  estimated_hours: number | null;
}

interface BurndownChartProps {
  tasks: Task[];
  startDate: Date;
  endDate: Date;
}

export default function BurndownChart({ tasks, startDate, endDate }: BurndownChartProps) {
  const chartData = useMemo(() => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dataPoints: Array<{ date: Date; ideal: number; actual: number; completed: number }> = [];

    const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
    const hoursPerDay = totalEstimatedHours / days;

    // Calculate completed tasks per day
    const completedByDate = new Map<string, number>();
    tasks.forEach(task => {
      if (task.completed_at) {
        const completedAt: string = task.completed_at;
        const date = new Date(completedAt).toISOString().split('T')[0] as string;
        const currentCompleted = completedByDate.get(date) || 0;
        completedByDate.set(date, currentCompleted + (task.estimated_hours || 0));
      }
    });

    let remainingHours = totalEstimatedHours;
    let completedHours = 0;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0] as string;

      // Add completed hours for this day
      const completedToday = completedByDate.get(dateStr);
      if (completedToday !== undefined) {
        completedHours += completedToday;
        remainingHours -= completedToday;
      }

      const idealRemaining = Math.max(0, totalEstimatedHours - (hoursPerDay * i));

      dataPoints.push({
        date,
        ideal: idealRemaining,
        actual: remainingHours,
        completed: completedHours,
      });
    }

    return dataPoints;
  }, [tasks, startDate, endDate]);

  const maxHours = useMemo(() => {
    return Math.max(
      ...chartData.map(d => Math.max(d.ideal, d.actual)),
      tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0)
    );
  }, [chartData, tasks]);

  const completedTasks = tasks.filter(t => t.status === "done").length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-indigo-600" />
            Burndown Chart
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{completionRate.toFixed(0)}%</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {completedTasks} / {totalTasks} tasks
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64 mb-4">
        <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(percent => (
            <line
              key={percent}
              x1="0"
              y1={percent * 2}
              x2="800"
              y2={percent * 2}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-zinc-200 dark:text-zinc-800"
            />
          ))}

          {/* Ideal line */}
          <polyline
            points={chartData.map((d, i) => {
              const x = (i / chartData.length) * 800;
              const y = (d.ideal / maxHours) * 200;
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="text-zinc-400 dark:text-zinc-600"
          />

          {/* Actual line */}
          <polyline
            points={chartData.map((d, i) => {
              const x = (i / chartData.length) * 800;
              const y = (d.actual / maxHours) * 200;
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-indigo-600 dark:text-indigo-400"
          />

          {/* Fill area */}
          <polygon
            points={`0,200 ${chartData.map((d, i) => {
              const x = (i / chartData.length) * 800;
              const y = (d.actual / maxHours) * 200;
              return `${x},${y}`;
            }).join(" ")} 800,200`}
            fill="currentColor"
            fillOpacity="0.1"
            className="text-indigo-600"
          />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{maxHours.toFixed(0)}h</span>
          <span>{(maxHours * 0.5).toFixed(0)}h</span>
          <span>0h</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-zinc-400 dark:bg-zinc-600 border-dashed border-t-2" />
          <span className="text-zinc-600 dark:text-zinc-400">Ideal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-indigo-600" />
          <span className="text-zinc-600 dark:text-zinc-400">Actual</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Estimated</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0).toFixed(1)}h
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Remaining</div>
          <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
            {tasks
              .filter(t => t.status !== "done")
              .reduce((sum, task) => sum + (task.estimated_hours || 0), 0)
              .toFixed(1)}h
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Completed</div>
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            {tasks
              .filter(t => t.status === "done")
              .reduce((sum, task) => sum + (task.estimated_hours || 0), 0)
              .toFixed(1)}h
          </div>
        </div>
      </div>
    </div>
  );
}

