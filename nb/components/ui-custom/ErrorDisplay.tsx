"use client";

/**
 * Enhanced error display components with better UX
 */

import { useState, useEffect } from "react";
import { UserFriendlyError } from '@/lib/errors/errorTypes';
import {
  WifiOff,
  Clock,
  Server,
  ShieldX,
  Crown,
  Users,
  AlertCircle,
  MailX,
  Key,
  FileX,
  Timer,
  ShieldAlert,
  MessageCircleX,
  Database,
  Wrench,
  AlertTriangle,
  UserCheck,
  UserX,
  MailCheck,
  Type,
  Shield,
  X,
  RefreshCw,
  ExternalLink,
  ChevronUp,
  ChevronDown
} from "lucide-react";

// Icon mapping for error types
const ERROR_ICONS = {
  'wifi-off': WifiOff,
  'clock': Clock,
  'server': Server,
  'shield-x': ShieldX,
  'crown': Crown,
  'users': Users,
  'alert-circle': AlertCircle,
  'mail-x': MailX,
  'key': Key,
  'file-x': FileX,
  'timer': Timer,
  'shield-alert': ShieldAlert,
  'message-circle-x': MessageCircleX,
  'database-x': Database,
  'wrench': Wrench,
  'alert-triangle': AlertTriangle,
  'user-check': UserCheck,
  'user-x': UserX,
  'mail-check': MailCheck,
  'type': Type,
  'shield': Shield
} as const;

interface ErrorDisplayProps {
  error: UserFriendlyError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = ''
}: ErrorDisplayProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(0);

  const IconComponent = ERROR_ICONS[error.details.icon as keyof typeof ERROR_ICONS] || AlertTriangle;

  // Auto-retry for retryable network errors
  useEffect(() => {
    if (error.details.retryable &&
      error.details.category === 'network' &&
      autoRetryCount < 3 &&
      onRetry) {
      const retryDelay = Math.pow(2, autoRetryCount) * 2000; // Exponential backoff
      const timer = setTimeout(() => {
        setAutoRetryCount(prev => prev + 1);
        onRetry();
      }, retryDelay);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, autoRetryCount, onRetry]);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getSeverityClasses = () => {
    switch (error.details.severity) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-950/20';
      case 'high':
        return 'border-red-400 bg-red-50 dark:bg-red-950/10';
      case 'medium':
        return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/10';
      case 'low':
        return 'border-blue-400 bg-blue-50 dark:bg-blue-950/10';
      default:
        return 'border-gray-400 bg-gray-50 dark:bg-gray-950/10';
    }
  };

  const getIconClasses = () => {
    switch (error.details.severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-red-500 dark:text-red-400';
      case 'medium':
        return 'text-yellow-500 dark:text-yellow-400';
      case 'low':
        return 'text-blue-500 dark:text-blue-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  return (
    <div className={`border-l-4 p-4 rounded-lg ${getSeverityClasses()} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={`h-5 w-5 ${getIconClasses()}`} />
        </div>

        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {error.details.title}
            </h3>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-2 text-gray-400 hover:text-gray-600 dark:text-zinc-400 dark:hover:text-gray-300"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {error.details.message}
          </p>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-3">
            {error.details.retryable && onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : error.details.action || 'Retry'}
              </button>
            )}

            {error.details.helpUrl && (
              <a
                href={error.details.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Learn more
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Auto-retry indicator */}
          {error.details.retryable && error.details.category === 'network' && autoRetryCount > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Auto-retry attempt {autoRetryCount}/3
            </div>
          )}

          {/* Technical details toggle */}
          {showDetails && (
            <div className="mt-3">
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showTechnicalDetails ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show details
                  </>
                )}
              </button>

              {showTechnicalDetails && (
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                  <div><strong>Error ID:</strong> {error.id}</div>
                  <div><strong>Category:</strong> {error.details.category}</div>
                  <div><strong>Severity:</strong> {error.details.severity}</div>
                  <div><strong>Timestamp:</strong> {error.timestamp.toISOString()}</div>
                  {error.context && (
                    <div><strong>Context:</strong> {JSON.stringify(error.context, null, 2)}</div>
                  )}
                  {error.originalError && (
                    <div><strong>Original:</strong> {JSON.stringify(error.originalError, null, 2)}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact error display for inline use
interface ErrorBannerProps {
  error: UserFriendlyError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  const IconComponent = ERROR_ICONS[error.details.icon as keyof typeof ERROR_ICONS] || AlertTriangle;

  return (
    <div className="flex items-center gap-2 p-2 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
      <IconComponent className="h-4 w-4 text-red-500 flex-shrink-0" />
      <span className="text-red-700 dark:text-red-300 flex-1">
        {error.details.title}: {error.details.message}
      </span>

      {error.details.retryable && onRetry && (
        <button
          onClick={onRetry}
          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
        >
          Retry
        </button>
      )}

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Toast notification for errors
interface ErrorToastProps {
  error: UserFriendlyError;
  onRetry?: () => void;
  onDismiss?: () => void;
  duration?: number;
}

export function ErrorToast({ error, onRetry, onDismiss, duration = 5000 }: ErrorToastProps) {
  useEffect(() => {
    if (onDismiss && duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [onDismiss, duration]);

  const IconComponent = ERROR_ICONS[error.details.icon as keyof typeof ERROR_ICONS] || AlertTriangle;

  return (
    <div className="max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto border border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <IconComponent className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {error.details.title}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {error.details.message}
            </p>

            {(onRetry || onDismiss) && (
              <div className="mt-3 flex space-x-3">
                {error.details.retryable && onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {error.details.action || 'Retry'}
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>

          {onDismiss && (
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={onDismiss}
                className="inline-flex text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
