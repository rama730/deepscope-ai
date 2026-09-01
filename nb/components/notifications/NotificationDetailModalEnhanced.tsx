"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, ExternalLink, CheckCircle2, XCircle, Copy, Share2, ChevronLeft, ChevronRight, Check, RotateCcw, Trash2, ZoomIn } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Notification, formatNotificationTime } from "@/lib/utils/notifications";
import AvatarWithFallback from "@/components/ui-custom/AvatarWithFallback";
import { format } from "date-fns";
import { useToast } from "@/components/ui-custom/Toast";
import LinkPreview from "@/components/LinkPreview";
import { projectHref } from "@/lib/routing/identifiers";

interface NotificationDetailModalEnhancedProps {
    notification: Notification | null;
    isOpen: boolean;
    onClose: () => void;
    onAction?: (action: string, notificationId: string, entityId?: string) => void;
    allNotifications?: Notification[];
    onNavigate?: (direction: 'prev' | 'next') => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    onMarkRead?: (id: string) => void;
    onMarkUnread?: (id: string) => void;
    onDelete?: (id: string) => void;
}

export default function NotificationDetailModalEnhanced({
    notification,
    isOpen,
    onClose,
    onAction,
    allNotifications = [],
    onNavigate,
    hasPrev = false,
    hasNext = false,
    onMarkRead,
    onMarkUnread,
    onDelete,
}: NotificationDetailModalEnhancedProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [timestampFormat, setTimestampFormat] = useState<'relative' | 'absolute'>('relative');
    const [imageZoomed, setImageZoomed] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    if (!notification) return null;

    const actor = notification.actor;
    const [relatedNotifications, setRelatedNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (notification && allNotifications.length > 0) {
            // Find related notifications (same actor or same entity)
            const related = allNotifications.filter(n =>
                n.id !== notification.id && (
                    n.actor_id === notification.actor_id ||
                    (n.related_entity_id === notification.related_entity_id && n.related_entity_type === notification.related_entity_type)
                )
            ).slice(0, 3);
            setRelatedNotifications(related);
        }
    }, [notification, allNotifications]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showDeleteConfirm) {
                    setShowDeleteConfirm(false);
                } else {
                    onClose();
                }
            } else if (e.key === 'Enter' && !showDeleteConfirm) {
                // Primary action (accept if available)
                if (notification.type === 'project_application' && onAction) {
                    onAction('accept', notification.id, notification.related_entity_id || undefined);
                    onClose();
                }
            } else if (e.key === 'ArrowLeft' && hasPrev && onNavigate) {
                onNavigate('prev');
            } else if (e.key === 'ArrowRight' && hasNext && onNavigate) {
                onNavigate('next');
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
                // Copy notification content
                handleCopy();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                // Mark as read/unread
                handleToggleRead();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, showDeleteConfirm, notification, hasPrev, hasNext, onNavigate, onAction]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(notification.message);
            showToast("Notification copied to clipboard", "success");
        } catch (err) {
            showToast("Failed to copy", "error");
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: 'Notification',
            text: notification.message,
            url: typeof window !== 'undefined' ? window.location.href : '',
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                // User cancelled or error
            }
        } else {
            // Fallback to copy
            handleCopy();
        }
    };

    const handleToggleRead = async () => {
        if (notification.is_read && onMarkUnread) {
            await onMarkUnread(notification.id);
            showToast("Marked as unread", "success");
        } else if (!notification.is_read && onMarkRead) {
            await onMarkRead(notification.id);
            showToast("Marked as read", "success");
        }
    };

    const handleDelete = async () => {
        if (onDelete) {
            await onDelete(notification.id);
            setShowDeleteConfirm(false);
            onClose();
            showToast("Notification deleted", "success");
        }
    };

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

    const getAbsoluteTime = (dateString: string) => {
        const date = new Date(dateString);
        return format(date, "PPpp"); // Full date and time
    };

    const getNotificationTypeLabel = () => {
        const types: Record<string, string> = {
            like: 'Like',
            comment: 'Comment',
            follow: 'Follow',
            repost: 'Repost',
            project_application: 'Project Application',
            mention: 'Mention',
        };
        return types[notification.type] || notification.type;
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
                        <div
                            ref={modalRef}
                            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto md:max-w-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Navigation buttons */}
                                    {(hasPrev || hasNext) && onNavigate && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => onNavigate('prev')}
                                                disabled={!hasPrev}
                                                className="p-1.5 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label="Previous notification"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onNavigate('next')}
                                                disabled={!hasNext}
                                                className="p-1.5 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label="Next notification"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                            Notification Details
                                        </h2>
                                        <span className="text-xs text-zinc-500 capitalize">
                                            {getNotificationTypeLabel()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {/* Action buttons */}
                                    <button
                                        onClick={handleCopy}
                                        className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                        aria-label="Copy notification"
                                        title="Copy (Ctrl+C)"
                                    >
                                        <Copy className="w-4 h-4 text-zinc-500" />
                                    </button>
                                    <button
                                        onClick={handleShare}
                                        className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                        aria-label="Share notification"
                                    >
                                        <Share2 className="w-4 h-4 text-zinc-500" />
                                    </button>
                                    {onMarkRead && onMarkUnread && (
                                        <button
                                            onClick={handleToggleRead}
                                            className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                            aria-label={notification.is_read ? 'Mark as unread' : 'Mark as read'}
                                            title="Toggle read status (Ctrl+D)"
                                        >
                                            {notification.is_read ? (
                                                <RotateCcw className="w-4 h-4 text-zinc-500" />
                                            ) : (
                                                <Check className="w-4 h-4 text-blue-500" />
                                            )}
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors text-red-500"
                                            aria-label="Delete notification"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                        aria-label="Close"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Delete confirmation */}
                            {showDeleteConfirm && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
                                    <span className="text-sm text-red-800 dark:text-red-200">
                                        Are you sure you want to delete this notification?
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="px-3 py-1 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                                {/* Actor Info */}
                                {actor && (
                                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                                        <Link
                                            href={`/profile/${actor.username || ''}`}
                                            className="flex items-center gap-4 hover:opacity-80 transition-opacity"
                                        >
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
                                        </Link>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const link = getLink();
                                                if (link) {
                                                    window.open(link, '_blank');
                                                }
                                            }}
                                            className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                            aria-label="Open in new tab"
                                        >
                                            <ExternalLink className="w-4 h-4 text-zinc-500" />
                                        </button>
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
                                        {/* Media Preview */}
                                        {notification.post.media?.urls?.[0] && (
                                            <>
                                                {notification.post.media.type === 'image' && (
                                                    <div className="mb-3 rounded-lg overflow-hidden relative group">
                                                        <Image
                                                            src={notification.post.media.urls[0]}
                                                            alt="Post content"
                                                            width={800}
                                                            height={600}
                                                            className={`w-full h-auto object-cover transition-all cursor-pointer ${imageZoomed ? 'max-h-none' : 'max-h-64'
                                                                }`}
                                                            onClick={() => setImageZoomed(!imageZoomed)}
                                                            style={{ width: '100%', height: 'auto' }}
                                                        />
                                                        <button
                                                            onClick={() => setImageZoomed(!imageZoomed)}
                                                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                            aria-label={imageZoomed ? "Zoom out" : "Zoom in"}
                                                        >
                                                            <ZoomIn className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                                {notification.post.media.type === 'video' && (
                                                    <div className="mb-3 rounded-lg overflow-hidden">
                                                        <video
                                                            src={notification.post.media.urls[0]}
                                                            controls
                                                            className="w-full max-h-64 object-cover rounded-lg"
                                                        >
                                                            Your browser does not support the video tag.
                                                        </video>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Post Content */}
                                        {notification.post.content && (
                                            <div>
                                                <p className={`text-sm text-zinc-600 dark:text-zinc-400 ${!isExpanded ? 'line-clamp-4' : ''}`}>
                                                    {notification.post.content}
                                                </p>
                                                {notification.post.content.length > 200 && (
                                                    <button
                                                        onClick={() => setIsExpanded(!isExpanded)}
                                                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                                                    >
                                                        {isExpanded ? 'Show less' : 'Read more'}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Link Preview - Extract URLs from content */}
                                        {notification.post.content && (() => {
                                            const urlRegex = /(https?:\/\/[^\s]+)/g;
                                            const urls = notification.post.content.match(urlRegex);
                                            if (urls && urls.length > 0) {
                                                return (
                                                    <div className="mt-3">
                                                        <LinkPreview url={urls[0]} />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}

                                {/* Metadata */}
                                <div className="flex flex-col gap-3 text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <button
                                            onClick={() => setTimestampFormat(timestampFormat === 'relative' ? 'absolute' : 'relative')}
                                            className="hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300 transition-colors text-left"
                                        >
                                            {timestampFormat === 'relative'
                                                ? formatNotificationTime(notification.created_at)
                                                : getAbsoluteTime(notification.created_at)
                                            }
                                        </button>
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

                                {/* Related Notifications */}
                                {relatedNotifications.length > 0 && (
                                    <div className="mb-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                                            Related Notifications
                                        </h4>
                                        <div className="space-y-2">
                                            {relatedNotifications.map((related) => (
                                                <div
                                                    key={related.id}
                                                    className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-sm"
                                                >
                                                    <p className="text-zinc-700 dark:text-zinc-300 line-clamp-2">
                                                        {related.message}
                                                    </p>
                                                    <p className="text-xs text-zinc-500 mt-1">
                                                        {formatNotificationTime(related.created_at)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

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
