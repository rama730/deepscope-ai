"use client";

import { CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { useState } from "react";

interface NotificationQuickActionsProps {
  notificationId: string;
  type: string;
  relatedEntityId?: string | null;
  onAction: (action: string, notificationId: string, entityId?: string) => void;
  isProcessing?: boolean;
}

export default function NotificationQuickActions({
  notificationId,
  type,
  relatedEntityId,
  onAction,
  isProcessing = false,
}: NotificationQuickActionsProps) {
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    if (isProcessing || processingAction) return;
    
    setProcessingAction(action);
    try {
      await onAction(action, notificationId, relatedEntityId || undefined);
    } finally {
      setProcessingAction(null);
    }
  };

  if (type === 'project_application') {
    return (
      <div className="flex gap-2 mt-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            handleAction('accept');
          }}
          disabled={isProcessing || processingAction === 'accept'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Accept
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            handleAction('decline');
          }}
          disabled={isProcessing || processingAction === 'decline'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" />
          Decline
        </button>
      </div>
    );
  }

  if (type === 'follow') {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          handleAction('follow-back');
        }}
        disabled={isProcessing || processingAction === 'follow-back'}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Follow Back
      </button>
    );
  }

  return null;
}
