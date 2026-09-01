"use client";

import { useMemo } from "react";
import { Calendar, Clock, CheckCircle } from "lucide-react";

interface ProjectTimelineIndicatorProps {
  createdAt: string;
  deadline?: string | null;
  currentStageIndex?: number;
  totalStages?: number;
}

export default function ProjectTimelineIndicator({ 
  createdAt, 
  deadline, 
  currentStageIndex = 0, 
  totalStages = 0 
}: ProjectTimelineIndicatorProps) {
  const daysSinceCreation = useMemo(() => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [createdAt]);

  const daysUntilDeadline = useMemo(() => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [deadline]);

  const progressPercentage = useMemo(() => {
    if (totalStages === 0) return 0;
    return Math.round(((currentStageIndex + 1) / totalStages) * 100);
  }, [currentStageIndex, totalStages]);

  return (
    <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
      <div className="flex items-center gap-1.5">
        <Calendar className="w-4 h-4" />
        <span>
          {daysSinceCreation === 0 ? "Created today" : 
           daysSinceCreation === 1 ? "Created yesterday" : 
           `Created ${daysSinceCreation} days ago`}
        </span>
      </div>
      
      {deadline && daysUntilDeadline !== null && (
        <div className={`flex items-center gap-1.5 ${
          daysUntilDeadline < 0 ? "text-red-600 dark:text-red-400" :
          daysUntilDeadline <= 7 ? "text-amber-600 dark:text-amber-400" :
          "text-emerald-600 dark:text-emerald-400"
        }`}>
          <Clock className="w-4 h-4" />
          <span>
            {daysUntilDeadline < 0 ? `${Math.abs(daysUntilDeadline)} days overdue` :
             daysUntilDeadline === 0 ? "Due today" :
             daysUntilDeadline === 1 ? "Due tomorrow" :
             `${daysUntilDeadline} days remaining`}
          </span>
        </div>
      )}

      {totalStages > 0 && (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4" />
          <span>{progressPercentage}% complete</span>
        </div>
      )}
    </div>
  );
}

