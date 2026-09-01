"use client";

import React from 'react';
import { CheckCircle, Zap, Undo2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Stage {
  name: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface LifecycleTrackerProps {
  stages: Stage[];
  canManage?: boolean;
  onAdvanceStage?: () => void;
  onRevertStage?: () => void;
  entityType?: 'project' | 'gig';
}

const Stage = ({ name, status }: { name: string; status: Stage['status'] }) => {
  const getStatusClasses = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'current':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300 ring-2 ring-indigo-300 shadow-md dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-600 dark:ring-indigo-600';
      case 'upcoming':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500';
    }
  };

  return (
    <div className={`relative flex-1 flex items-center justify-center h-10 rounded-lg text-sm font-semibold transition-all duration-300 border ${getStatusClasses()}`}>
      {status === 'completed' && <CheckCircle className="w-4 h-4 mr-2" />}
      {name}
    </div>
  );
};

const Connector = ({ isCompleted }: { isCompleted: boolean }) => (
  <div className="flex-shrink-0 w-8 h-px bg-slate-300 dark:bg-slate-700 relative">
    <motion.div
      className="absolute top-0 left-0 h-full bg-green-500 dark:bg-green-400"
      initial={{ width: '0%' }}
      animate={{ width: isCompleted ? '100%' : '0%' }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    />
  </div>
);

export default function LifecycleTracker({ 
  stages = [], 
  canManage = false, 
  onAdvanceStage, 
  onRevertStage, 
  entityType = 'project' 
}: LifecycleTrackerProps) {
  const currentStageIndex = stages.findIndex(s => s.status === 'current');
  const isLastStage = currentStageIndex === stages.length - 1;
  const isFirstStage = currentStageIndex === 0;
  const hasCurrentStage = currentStageIndex !== -1;
  const titleText = entityType === 'gig' ? 'Service Lifecycle' : 'Project Lifecycle';
  const startText = entityType === 'gig' ? 'Start Service' : 'Start Project';

  if (stages.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-zinc-100">{titleText}</h3>
        {canManage && (
          <div className="flex items-center gap-2">
            {hasCurrentStage ? (
              <>
                <button
                  onClick={onRevertStage}
                  disabled={isFirstStage}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Undo2 className="w-4 h-4" />
                  Revert Stage
                </button>
                <button
                  onClick={onAdvanceStage}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  {isLastStage ? "Mark Final Stage as Complete" : "Advance to Next Stage"}
                </button>
              </>
            ) : (
              stages.length > 0 && (
                <button
                  onClick={onAdvanceStage}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition-colors"
                >
                  {startText}
                </button>
              )
            )}
          </div>
        )}
      </div>
      <div className="flex items-center w-full">
        {stages.map((stage, index) => (
          <React.Fragment key={index}>
            <Stage
              name={stage.name}
              status={stage.status}
            />
            {index < stages.length - 1 && (
              <Connector isCompleted={stage.status === 'completed'} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
