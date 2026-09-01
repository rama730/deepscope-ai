"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Notification, formatNotificationTime } from "@/lib/utils/notifications";
import AvatarWithFallback from "@/components/ui-custom/AvatarWithFallback";
import { projectHref } from "@/lib/routing/identifiers";

interface NotificationDetailModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, notificationId: string, entityId?: string) => void;
}

export default function NotificationDetailModal({
  notification,
  isOpen,
  onClose,
  onAction,
}: NotificationDetailModalProps) {
  if (!notification) return null;

  const actor = notification.actor;
  const getActionButtons = () => {
    if (notification.type === 'project_application' && notification.related_entity_id) {
      return (
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              if (onAction) {
                onAction('accept', notification.id, notification.related_entity_id || undefined);
              }
              onClose();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Accept
          </button>
          <button
            onClick={() => {
              if (onAction) {
                onAction('decline', notification.id, notification.related_entity_id || undefined);
              }
              onClose();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Decline
          </button>
        </div>
      );
    }
    return null;
  };

  const getLink = () => {
    if (notification.type === 'follow' && actor?.username) {
      return `/profile/${actor.username}`;
    }
    if (notification.related_entity_type === 'post' && notification.related_entity_id) {
      return `/post/${notification.related_entity_id}`;
    }
    if (notification.related_entity_type === 'project' && notification.related_entity_id) {
      return projectHref(notification.project?.slug || notification.related_entity_id);
    }
    return null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Notification Details
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Actor Info */}
                {actor && (
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                    <AvatarWithFallback
                      src={actor.avatar_url}
                      alt={actor.full_name || actor.username || "User"}
                      fallback={actor.username || actor.full_name || "U"}
                      size="lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {actor.full_name || actor.username || "Unknown User"}
                      </h3>
                      {actor.username && (
                        <p className="text-sm text-zinc-500">@{actor.username}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notification Message */}
                <div className="mb-6">
                  <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {notification.message}
                  </p>
                </div>

                {/* Post Preview */}
                {notification.post && (
                  <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    {notification.post.media?.urls?.[0] && notification.post.media.type === 'image' && (
                      <div className="mb-3 rounded-lg overflow-hidden">
                        <Image
                          src={notification.post.media.urls[0]}
                          alt="Post content"
                          width={600}
                          height={400}
                          className="w-full h-auto max-h-64 object-cover"
                          style={{ width: '100%', height: 'auto' }}
                        />
                      </div>
                    )}
                    {notification.post.content && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-4">
                        {notification.post.content}
                      </p>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-col gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatNotificationTime(notification.created_at)}</span>
                  </div>
                  {(() => {
                    const link = getLink();
                    return link && (
                      <Link
                        href={link}
                        onClick={onClose}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View {notification.type === 'follow' ? 'Profile' : notification.related_entity_type === 'post' ? 'Post' : 'Item'}
                      </Link>
                    );
                  })()}
                </div>

                {/* Action Buttons */}
                {getActionButtons()}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
