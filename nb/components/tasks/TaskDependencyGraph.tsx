"use client";

import { useMemo } from "react";
import { ArrowRight, Circle, CheckCircle, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
}

interface Dependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
}

interface TaskDependencyGraphProps {
  tasks: Task[];
  dependencies: Dependency[];
  selectedTaskId?: string;
  onTaskSelect?: (taskId: string) => void;
}

export default function TaskDependencyGraph({
  tasks,
  dependencies,
  selectedTaskId,
  onTaskSelect,
}: TaskDependencyGraphProps) {
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach(task => map.set(task.id, task));
    return map;
  }, [tasks]);

  function getStatusIcon(status: string) {
    switch (status) {
      case "done":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Circle className="w-4 h-4 text-zinc-400" />;
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "high":
        return "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30";
      case "medium":
        return "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30";
      default:
        return "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900";
    }
  }

  const layout = useMemo(() => {
    const levels: string[][] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();

    tasks.forEach(task => {
      inDegree.set(task.id, 0);
    });
    dependencies.forEach(dep => {
      inDegree.set(dep.task_id, (inDegree.get(dep.task_id) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) {
        queue.push(taskId);
      }
    });

    while (queue.length > 0) {
      const level: string[] = [];
      const levelSize = queue.length;

      for (let i = 0; i < levelSize; i++) {
        const taskId = queue.shift()!;
        if (visited.has(taskId)) continue;
        visited.add(taskId);
        level.push(taskId);

        dependencies.forEach(dep => {
          if (dep.depends_on_task_id === taskId && !visited.has(dep.task_id)) {
            const currentDegree = inDegree.get(dep.task_id) ?? 0;
            const newDegree = currentDegree - 1;
            inDegree.set(dep.task_id, newDegree);
            if (newDegree === 0) {
              queue.push(dep.task_id);
            }
          }
        });
      }

      if (level.length > 0) {
        levels.push(level);
      }
    }

    // Add remaining tasks (cycles or isolated)
    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        if (levels.length === 0) levels.push([]);
        const lastLevel = levels[levels.length - 1];
        if (lastLevel) {
          lastLevel.push(task.id);
        }
      }
    });

    return levels;
  }, [tasks, dependencies]);

  return (
    <div className="w-full overflow-x-auto p-4 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
      <div className="flex gap-8 min-w-max">
        {layout.map((level, levelIndex) => (
          <div key={levelIndex} className="flex flex-col gap-4">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 text-center">
              Level {levelIndex + 1}
            </div>
            {level.map(taskId => {
              const task = taskMap.get(taskId);
              if (!task) return null;

              const dependents = dependencies.filter(d => d.depends_on_task_id === taskId);
              const dependenciesForTask = dependencies.filter(d => d.task_id === taskId);

              return (
                <div key={taskId} className="relative">
                  <div
                    className={`p-3 rounded-lg border-2 min-w-[200px] cursor-pointer transition-all ${selectedTaskId === taskId
                      ? "border-indigo-500 shadow-lg scale-105"
                      : getPriorityColor(task.priority)
                      }`}
                    onClick={() => onTaskSelect?.(taskId)}
                  >
                    <div className="flex items-start gap-2">
                      {getStatusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                          {dependenciesForTask.length > 0 && (
                            <span>Depends on {dependenciesForTask.length}</span>
                          )}
                          {dependents.length > 0 && (
                            <span>• Blocks {dependents.length}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {dependents.length > 0 && levelIndex < layout.length - 1 && (
                    <div className="absolute right-0 top-1/2 translate-x-8 -translate-y-1/2">
                      <ArrowRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {layout.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          No task dependencies. Add dependencies to visualize the task flow.
        </div>
      )}
    </div>
  );
}
