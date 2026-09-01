"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { NotificationGroup, formatNotificationTime } from "@/lib/utils/notifications";
import { Heart, MessageCircle, UserPlus, Briefcase, Bell, ChevronDown, ChevronUp, Check } from "lucide-react";
import AvatarWithFallback from "@/components/ui-custom/AvatarWithFallback";
import SwipeableNotificationItem from "./SwipeableNotificationItem";
import NotificationQuickActions from "./NotificationQuickActions";
import { projectHref } from "@/lib/routing/identifiers";


interface NotificationItemProps {
    group: NotificationGroup;
    onClick: () => void;
    onAction?: (action: string, notificationId: string, entityId?: string) => void;
    onMarkRead?: () => void;
    onDelete?: () => void;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    showSelection?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    showSwipeActions?: boolean;
    isHighPriority?: boolean;
}

const MAX_PREVIEW_LENGTH = 150;

export default function NotificationItemEnhanced({
    group,
    onClick,
    onAction,
    onMarkRead,
    onDelete,
    isSelected = false,
    onToggleSelection,
    showSelection = false,
    isExpanded = false,
    onToggleExpand,
    showSwipeActions = true,
    isHighPriority = false,
}: NotificationItemProps) {
    const { type, actors, notifications, post, latest_at, is_read } = group;
    const count = notifications.length;
    const mainActor = actors[0];
    const [isHovered, setIsHovered] = useState(false);

    // Determine Icon and Color
    const getIcon = () => {
        switch (type) {
            case 'like': return <Heart className="w-3.5 h-3.5 text-white" fill="currentColor" />;
            case 'comment': return <MessageCircle className="w-3.5 h-3.5 text-white" fill="currentColor" />;
            case 'follow': return <UserPlus className="w-3.5 h-3.5 text-white" />;
            case 'project_application': return <Briefcase className="w-3.5 h-3.5 text-white" />;
            default: return <Bell className="w-3.5 h-3.5 text-white" />;
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'like': return 'bg-red-500';
            case 'comment': return 'bg-blue-500';
            case 'follow': return 'bg-green-500';
            case 'project_application': return 'bg-purple-500';
            default: return 'bg-zinc-500';
        }
    };

    // Determine Link
    const getLink = () => {
        if (type === 'follow' && mainActor) return `/profile/${mainActor.username}`;
        if (post) return `/post/${post.id}`;
        if (notifications[0]?.related_entity_type === 'project' && notifications[0]?.related_entity_id) {
            return projectHref(notifications[0].project?.slug || notifications[0].related_entity_id);
        }
        return '/notifications';
    };

    // Determine Text with truncation
    const renderText = () => {


        let text = "";

        if (count > 1) {
            const othersCount = count - 1;
            if (type === 'like') {
                text = `${mainActor?.full_name || mainActor?.username || 'Someone'} and ${othersCount} others liked your post`;
            } else if (type === 'follow') {
                text = `${mainActor?.full_name || mainActor?.username || 'Someone'} and ${othersCount} others followed you`;
            } else {
                text = notifications[0]?.message || "";
            }
        } else {
            switch (type) {
                case 'like': text = `${mainActor?.full_name || mainActor?.username || 'Someone'} liked your post`; break;
                case 'comment': text = `${mainActor?.full_name || mainActor?.username || 'Someone'} commented: "${notifications[0]?.message || ""}"`; break;
                case 'follow': text = `${mainActor?.full_name || mainActor?.username || 'Someone'} followed you`; break;
                case 'repost': text = `${mainActor?.full_name || mainActor?.username || 'Someone'} reposted your post`; break;
                default: text = notifications[0]?.message || "";
            }
        }

        // Truncate if too long
        if (text.length > MAX_PREVIEW_LENGTH && !isExpanded) {
            return (
                <>
                    {text.substring(0, MAX_PREVIEW_LENGTH)}...
                    {onToggleExpand && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleExpand();
                            }}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium ml-1"
                        >
                            Read more
                        </button>
                    )}
                </>
            );
        }

        return text;
    };

    const handleMarkRead = () => {
        if (onMarkRead) {
            onMarkRead();
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete();
        }
    };

    const canExpand = count > 1 && actors.length > 2;

    const content = (
        <div
            className={`group relative block transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${!is_read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''} ${isHighPriority ? 'border-l-4 border-purple-500' : ''
                }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex gap-4 p-4">
                {/* Selection checkbox */}
                {showSelection && onToggleSelection && (
                    <div className="flex items-start pt-1">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleSelection();
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-zinc-300 dark:border-zinc-600 hover:border-blue-500'
                                }`}
                            aria-label={isSelected ? 'Deselect' : 'Select'}
                        >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                    </div>
                )}

                {/* Avatar Section */}
                <div className="relative flex-shrink-0">
                    {actors.length > 1 ? (
                        // Stacked Avatars for groups
                        <div className="relative w-12 h-12">
                            {actors.slice(0, 2).map((actor, i) => (
                                <div
                                    key={i}
                                    className={`absolute w-9 h-9 rounded-full border-2 border-white dark:border-zinc-950 overflow-hidden ${i === 0 ? 'top-0 left-0 z-10' : 'bottom-0 right-0 z-0 opacity-80'
                                        }`}
                                >
                                    <AvatarWithFallback
                                        src={actor.avatar_url}
                                        alt={actor.full_name || actor.username || "User"}
                                        fallback={actor.username || actor.full_name || "U"}
                                        size="sm"
                                        className="w-full h-full"
                                    />
                                </div>
                            ))}
                            {actors.length > 2 && !isExpanded && (
                                <div className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-zinc-600 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-xs text-white font-bold z-20">
                                    +{actors.length - 2}
                                </div>
                            )}
                        </div>
                    ) : (
                        // Single Avatar
                        <div className="w-12 h-12">
                            <AvatarWithFallback
                                src={mainActor?.avatar_url}
                                alt={mainActor?.full_name || mainActor?.username || "User"}
                                fallback={mainActor?.username || mainActor?.full_name || "U"}
                                size="lg"
                            />
                        </div>
                    )}

                    {/* Icon Badge */}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-sm ${getIconBg()} z-20`}>
                        {getIcon()}
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-[15px] leading-snug text-zinc-600 dark:text-zinc-300">
                        {renderText()}
                    </p>

                    {/* Expanded actors list */}
                    {isExpanded && actors.length > 2 && (
                        <div className="mt-2 space-y-1">
                            {actors.slice(2).map((actor, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-zinc-500">
                                    <AvatarWithFallback
                                        src={actor.avatar_url}
                                        alt={actor.full_name || actor.username || "User"}
                                        fallback={actor.username || actor.full_name || "U"}
                                        size="sm"
                                    />
                                    <span>{actor.full_name || actor.username}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-xs text-zinc-400 font-medium">
                            {formatNotificationTime(latest_at)}
                        </p>
                        {!is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                        )}
                    </div>

                    {/* Quick Actions */}
                    {onAction && isHovered && notifications[0]?.id && notifications[0]?.related_entity_id && (
                        <NotificationQuickActions
                            notificationId={notifications[0].id}
                            type={type}
                            relatedEntityId={notifications[0].related_entity_id}
                            onAction={onAction}
                        />
                    )}

                    {/* Expand/Collapse button */}
                    {canExpand && onToggleExpand && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleExpand();
                            }}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1"
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="w-3 h-3" />
                                    Show less
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-3 h-3" />
                                    Show {actors.length - 2} more
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Media Preview (Right Side) */}
                {post?.media?.urls?.[0] && post.media.type === 'image' && (
                    <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                        <Image
                            src={post.media.urls[0]}
                            alt="Post media"
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
            </div>
        </div>
    );

    if (showSwipeActions && (onMarkRead || onDelete)) {
        return (
            <SwipeableNotificationItem
                onSwipeLeft={onMarkRead ? handleMarkRead : undefined}
                onSwipeRight={onDelete ? handleDelete : undefined}
                onMarkRead={onMarkRead ? handleMarkRead : undefined}
                onDelete={onDelete ? handleDelete : undefined}
                canSwipe={typeof window !== 'undefined' && 'ontouchstart' in window}
            >
                <Link href={getLink()} onClick={onClick} aria-label={`Notification: ${(notifications[0]?.message || "").substring(0, 50)}`}>
                    {content}
                </Link>
            </SwipeableNotificationItem>
        );
    }

    return (
        <Link href={getLink()} onClick={onClick} aria-label={`Notification: ${(notifications[0]?.message || "").substring(0, 50)}`}>
            {content}
        </Link>
    );
}
