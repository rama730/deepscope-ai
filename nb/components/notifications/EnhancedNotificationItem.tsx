/**
 * Enhanced notification item component with better context and actions
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, UserPlus, Briefcase, Clock, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { profileHref, projectHref } from "@/lib/routing/identifiers";

interface EnhancedNotification {
  id: string;
  type: string;
  message: string;
  actor_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    content: string | null;
    media: any | null;
  };
  project?: {
    id: string;
    slug: string | null;
  } | null;
  metadata?: {
    extra_data?: any;
  };
}

interface NotificationItemProps {
  notification: EnhancedNotification;
  onMarkRead?: (id: string) => void;
  onAction?: (action: string, notificationId: string, entityId?: string) => void;
  showActions?: boolean;
}

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US");
};

export function EnhancedNotificationItem({
  notification,
  onMarkRead,
  onAction,
  showActions = true
}: NotificationItemProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500" fill="currentColor" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'project_application':
        return <Briefcase className="h-5 w-5 text-purple-500" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-400" />;
    }
  };

  const getNotificationLink = () => {
    switch (notification.type) {
      case 'like':
      case 'comment':
        return notification.related_entity_id ? `/posts/${notification.related_entity_id}` : null;
      case 'follow':
        return notification.actor?.username ? profileHref(notification.actor.username) : null;
      case 'project_application':
        return notification.related_entity_id ? projectHref(notification.project?.slug || notification.related_entity_id) : null;
      default:
        return null;
    }
  };

  const handleAction = async (action: string) => {
    if (!onAction || isProcessing) return;

    setIsProcessing(true);
    try {
      await onAction(action, notification.id, notification.related_entity_id || undefined);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkRead = () => {
    if (onMarkRead && !notification.is_read) {
      onMarkRead(notification.id);
    }
  };

  const notificationLink = getNotificationLink();

  const NotificationContent = () => (
    <div
      className={`flex items-start gap-3 p-4 transition-colors ${!notification.is_read
        ? 'bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500'
        : 'hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-gray-800/50'
        }`}
      onClick={handleMarkRead}
    >
      {/* Actor Avatar */}
      <div className="flex-shrink-0">
        {notification.actor?.avatar_url ? (
          <Image
            src={notification.actor.avatar_url}
            alt={notification.actor.full_name || notification.actor.username || 'User'}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            {getNotificationIcon()}
          </div>
        )}
      </div>

      {/* Notification Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {notification.message}
            </p>

            {/* Post preview for post-related notifications */}
            {notification.post && (
              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {notification.post.content}
                </p>
              </div>
            )}

            {/* Action buttons for actionable notifications */}
            {showActions && notification.type === 'project_application' && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleAction('accept');
                  }}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Accept
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleAction('decline');
                  }}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                >
                  <XCircle className="h-3 w-3" />
                  Decline
                </button>
              </div>
            )}

            {/* Follow back action */}
            {showActions && notification.type === 'follow' && (
              <div className="mt-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleAction('follow_back');
                  }}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
                >
                  <UserPlus className="h-3 w-3" />
                  Follow back
                </button>
              </div>
            )}
          </div>

          {/* Timestamp and read indicator */}
          <div className="flex flex-col items-end gap-1 ml-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getTimeAgo(notification.created_at)}
            </span>
            {!notification.is_read && (
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            )}
          </div>
        </div>
      </div>

      {/* Link indicator */}
      {notificationLink && (
        <div className="flex-shrink-0 ml-2">
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </div>
      )}
    </div>
  );

  if (notificationLink) {
    return (
      <Link href={notificationLink} className="block">
        <NotificationContent />
      </Link>
    );
  }

  return <NotificationContent />;
}

// Grouped notification item for multiple similar notifications
interface GroupedNotificationProps {
  notifications: EnhancedNotification[];
  type: string;
  onMarkAllRead?: (ids: string[]) => void;
  onExpand?: () => void;
  isExpanded?: boolean;
}


export function GroupedNotificationItem({
  notifications,
  type,
  onMarkAllRead,
  onExpand,
  isExpanded = false
}: GroupedNotificationProps) {
  const primaryNotification = notifications[0];
  const count = notifications.length;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getGroupMessage = () => {
    const actors = notifications.slice(0, 3).map(n =>
      n.actor?.full_name || n.actor?.username || 'Someone'
    );

    switch (type) {
      case 'like':
        if (count === 1) return `${actors[0]} liked your post`;
        if (count === 2) return `${actors[0]} and ${actors[1]} liked your post`;
        return `${actors[0]}, ${actors[1]} and ${count - 2} others liked your post`;
      case 'follow':
        if (count === 1) return `${actors[0]} started following you`;
        if (count === 2) return `${actors[0]} and ${actors[1]} started following you`;
        return `${actors[0]}, ${actors[1]} and ${count - 2} others started following you`;
      default:
        return `${count} new ${type} notifications`;
    }
  };

  return (
    <div className={`border-l-4 ${unreadCount > 0 ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {getGroupMessage()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {primaryNotification && getTimeAgo(primaryNotification.created_at)}
              {count && count > 3 && (
                <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                  {unreadCount} new
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            {unreadCount > 0 && onMarkAllRead && (
              <button
                onClick={() => onMarkAllRead(notifications.map(n => n.id))}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Mark all read
              </button>
            )}
            {onExpand && (
              <button
                onClick={onExpand}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {notifications.map(notification => (
            <EnhancedNotificationItem
              key={notification.id}
              notification={notification}
              showActions={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
