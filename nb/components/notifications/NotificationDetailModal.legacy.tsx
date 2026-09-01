"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Notification, formatNotificationTime } from "@/lib/utils/notifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { projectHref } from "@/lib/routing/identifiers";
// ... imports above

interface NotificationDetailModalProps {
    notification: Notification;
    isOpen: boolean;
    onClose: () => void;
    onAction?: (action: string, notification: Notification) => void;
}

export function NotificationDetailModal({ notification, isOpen, onClose }: NotificationDetailModalProps) {
    const actor = notification.actor;

    const getLink = () => {
        if (notification.type === 'follow') return `/profile/${actor?.username || ''}`;
        if (notification.related_entity_type === 'post') return `/post/${notification.related_entity_id}`;
        if (notification.related_entity_type === 'project') return projectHref(notification.project?.slug || notification.related_entity_id || '');
        return null;
    };

    const getActionButtons = () => {
        // legacy mock for now
        return null;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl z-[101] overflow-hidden"
                    >
                        <div className="p-6">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Actor Info */}
                            {actor && (
                                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={actor.avatar_url || undefined} alt={actor.username || "User"} />
                                        <AvatarFallback>{(actor.full_name || actor.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
