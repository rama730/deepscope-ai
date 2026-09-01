"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { TrendingDown, Calendar, Target, Zap, Info } from "lucide-react";
import { perfTracker } from "@/lib/performance/measure";

interface BurndownData {
  date: string;
  ideal: number;
  actual: number;
  completed: number;
}

interface Sprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface BurndownChartProps {
  projectId: string;
  sprintId?: string;
}

export default function BurndownChart({ projectId, sprintId }: BurndownChartProps) {
  const supabase = createSupabaseBrowserClient();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>(sprintId || "");
  const [burndownData, setBurndownData] = useState<BurndownData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const computationCache = useRef<Map<string, { data: BurndownData[]; totalPoints: number }>>(new Map());

  // Load sprints
  useEffect(() => {
    async function loadSprints() {
      const { data } = await supabase
        .from("project_sprints")
        .select("id, name, start_date, end_date, status")
        .eq("project_id", projectId)
        .in("status", ["active", "completed"])
        .order("start_date", { ascending: false });

      if (data && data.length > 0) {
        setSprints(data);
        if (!selectedSprintId) {
          const activeSprint = data.find((s) => s.status === "active");
          const firstSprint = data[0];
          setSelectedSprintId(activeSprint?.id || firstSprint?.id || "");
        }
      }
    }
    loadSprints();
  }, [projectId, supabase, selectedSprintId]);

  // Load burndown data
  useEffect(() => {
    if (!selectedSprintId) {
      setLoading(false);
      return;
    }

    async function loadBurndownData() {
      perfTracker.start('burndown-chart-load', { projectId, sprintId: selectedSprintId });
      setLoading(true);

      const sprint = sprints.find((s) => s.id === selectedSprintId);
      if (!sprint || !sprint.start_date) {
        setLoading(false);
        return;
      }

      // Get all tasks in this sprint
      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("id, status, story_points, completed_at, created_at")
        .eq("sprint_id", selectedSprintId);

      if (!tasks || !selectedSprintId) {
        setLoading(false);
        return;
      }

      // Calculate total points
      const total = tasks.reduce((sum, t) => sum + (t.story_points || 1), 0);
      setTotalPoints(total);

      // Generate date range
      if (!sprint.end_date) {
        setLoading(false);
        return;
      }
      
      const startDate = new Date(sprint.start_date);
      const endDate = new Date(sprint.end_date);
      const today = new Date();
      const dates: string[] = [];

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayString = d.toISOString().split("T")[0];
        if (dayString && /^\d{4}-\d{2}-\d{2}$/.test(dayString)) {
          dates.push(dayString);
        }
      }

      const totalDays = dates.length;
      const pointsPerDay = totalDays > 1 ? total / (totalDays - 1) : 0;

      // Check cache first
      const cacheKey = `${selectedSprintId}-${tasks.length}-${total}`;
      const cached = computationCache.current.get(cacheKey);
      if (cached) {
        setBurndownData(cached.data);
        setTotalPoints(cached.totalPoints);
        perfTracker.end('burndown-chart-load', {
          dataPoints: cached.data.length,
          totalPoints: cached.totalPoints,
          cached: true,
        });
        setLoading(false);
        return;
      }

      // Pre-compute completed points by date for O(1) lookup
      const completedByDate = new Map<string, number>();
      tasks.forEach((task) => {
        if (task.completed_at) {
          const completedDateStr = new Date(task.completed_at).toISOString().split("T")[0];
          if (completedDateStr && /^\d{4}-\d{2}-\d{2}$/.test(completedDateStr)) {
            const existing = completedByDate.get(completedDateStr) || 0;
            completedByDate.set(completedDateStr, existing + ((task.story_points as number) || 1));
          }
        }
      });

      // Calculate burndown data with optimized computation
      let cumulativeCompleted = 0;
      const data: BurndownData[] = dates.map((date, index) => {
        const dateObj = new Date(date);

        // Ideal line (linear decrease)
        const ideal = Math.max(0, total - pointsPerDay * index);

        // Actual remaining (only calculate for past/current dates)
        let actual = total;
        let completed = 0;

        if (dateObj <= today) {
          // Add completed points for this date
          cumulativeCompleted += completedByDate.get(date) || 0;
          completed = cumulativeCompleted;
          actual = total - completed;
        } else {
          actual = -1;
        }

        return {
          date,
          ideal: Math.round(ideal * 10) / 10,
          actual: actual >= 0 ? Math.round(actual * 10) / 10 : -1,
          completed: Math.round(completed * 10) / 10,
        };
      });

      // Cache the result
      computationCache.current.set(cacheKey, { data, totalPoints: total });

      setBurndownData(data);
      perfTracker.end('burndown-chart-load', {
        dataPoints: data.length,
        totalPoints,
      });
      setLoading(false);
    }

    loadBurndownData();
  }, [selectedSprintId, sprints, supabase, projectId]);

  // Chart dimensions
  const chartWidth = 600;
  const chartHeight = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Adaptive rendering: reduce data points for very long sprints (>60 days)
  const renderedData = useMemo(() => {
    if (burndownData.length <= 60) return burndownData;
    // Sample every Nth point for long sprints
    const step = Math.ceil(burndownData.length / 60);
    return burndownData.filter((_, i) => i % step === 0 || i === burndownData.length - 1);
  }, [burndownData]);

  // Calculate scales
  const maxY = totalPoints || 100;
  const xScale = (index: number) => padding.left + (index / (renderedData.length - 1 || 1)) * graphWidth;
  const yScale = (value: number) => padding.top + graphHeight - (value / maxY) * graphHeight;

  // Generate path for ideal line (using rendered data)
  const idealPath = useMemo(() => {
    if (renderedData.length === 0) return "";
    return renderedData
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.ideal)}`)
      .join(" ");
  }, [renderedData, xScale, yScale]);

  // Generate path for actual line (using rendered data)
  const actualPath = useMemo(() => {
    if (renderedData.length === 0) return "";
    const validData = renderedData.filter((d) => d.actual >= 0);
    return validData
      .map((d, i) => {
        const originalIndex = renderedData.findIndex((bd) => bd.date === d.date);
        return `${i === 0 ? "M" : "L"} ${xScale(originalIndex)} ${yScale(d.actual)}`;
      })
      .join(" ");
  }, [renderedData, xScale, yScale]);

  // Get current sprint
  const currentSprint = sprints.find((s) => s.id === selectedSprintId);

  // Calculate stats (use full data, not rendered subset)
  const lastActualData = burndownData.filter((d) => d.actual >= 0).pop();
  const completedPoints = lastActualData ? totalPoints - lastActualData.actual : 0;
  const progress = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;

  if (sprints.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center">
        <TrendingDown className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">No Sprint Data</h3>
        <p className="text-sm text-zinc-500 mt-1">
          Create and start a sprint to see burndown charts
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TrendingDown className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Burndown Chart
              </h3>
              <p className="text-xs text-zinc-500">Track sprint progress</p>
            </div>
          </div>

          <select
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name} {sprint.status === "active" && "(Active)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Row */}
      {currentSprint && currentSprint.start_date && (
        <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500">Duration</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {new Date(currentSprint.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                {new Date(currentSprint.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500">Total Points</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {totalPoints}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-zinc-500">Completed</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {completedPoints} ({Math.round(progress)}%)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-zinc-500">Remaining</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {lastActualData?.actual ?? totalPoints}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : burndownData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-zinc-500">
            No data available
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto"
              style={{ maxHeight: "300px" }}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={yScale(maxY * ratio)}
                    x2={chartWidth - padding.right}
                    y2={yScale(maxY * ratio)}
                    stroke="currentColor"
                    strokeOpacity={0.1}
                    strokeDasharray="4,4"
                  />
                  <text
                    x={padding.left - 10}
                    y={yScale(maxY * ratio)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-xs fill-zinc-400"
                  >
                    {Math.round(maxY * ratio)}
                  </text>
                </g>
              ))}

              {renderedData.map((d, i) => {
                if (i % Math.ceil(renderedData.length / 7) !== 0 && i !== renderedData.length - 1) return null;
                return (
                  <text
                    key={d.date}
                    x={xScale(i)}
                    y={chartHeight - 10}
                    textAnchor="middle"
                    className="text-xs fill-zinc-400"
                  >
                    {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </text>
                );
              })}

              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
                d={idealPath}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="6,4"
              />

              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.3 }}
                d={actualPath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {renderedData
                .filter((d) => d.actual >= 0)
                .map((d) => {
                  const index = renderedData.findIndex((bd) => bd.date === d.date);
                  return (
                    <motion.circle
                      key={d.date}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      cx={xScale(index)}
                      cy={yScale(d.actual)}
                      r="5"
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth="2"
                    />
                  );
                })}

              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const todayIndex = renderedData.findIndex((d) => d.date === todayStr);
                if (todayIndex === -1) return null;

                return (
                  <g>
                    <line
                      x1={xScale(todayIndex)}
                      y1={padding.top}
                      x2={xScale(todayIndex)}
                      y2={chartHeight - padding.bottom}
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={xScale(todayIndex)}
                      y={padding.top - 5}
                      textAnchor="middle"
                      className="text-xs fill-red-500 font-medium"
                    >
                      Today
                    </text>
                  </g>
                );
              })()}
            </svg>

            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-zinc-400" style={{ borderStyle: "dashed" }} />
                <span className="text-xs text-zinc-500">Ideal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-500 rounded" />
                <span className="text-xs text-zinc-500">Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500" style={{ borderStyle: "dashed" }} />
                <span className="text-xs text-zinc-500">Today</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-start gap-2 text-xs text-zinc-500">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            The burndown chart shows remaining work (story points) over time. The dashed line represents
            the ideal pace, while the solid line shows actual progress.
          </p>
        </div>
      </div>
    </div>
  );
}
