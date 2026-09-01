"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { NotificationGroup, formatNotificationTime } from "@/lib/utils/notifications";
import { Heart, MessageCircle, UserPlus, Briefcase, Bell, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SwipeableNotificationItem from "./SwipeableNotificationItem";
import NotificationQuickActions from "./NotificationQuickActions";
import { cn } from "@/lib/utils";
import { projectHref } from "@/lib/routing/identifiers";

interface NotificationItemEnhancedProps {
    group: NotificationGroup;
    onClick?: () => void;
    onAction?: (action: string, notificationId: string, entityId?: string) => void;
    onMarkRead?: () => void;
    onDelete?: () => void;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    showSelection?: boolean;
    isHighPriority?: boolean;
    showSwipeActions?: boolean;
}

export default function NotificationItemEnhanced({
    group,
    onClick,
    onAction,
    onMarkRead,
    onDelete,
    isSelected,
    onToggleSelection,
    isExpanded = false,
    onToggleExpand,
    showSelection,
    isHighPriority,
    showSwipeActions = true
}: NotificationItemEnhancedProps) {
    const { notifications, type, is_read, latest_at, actors } = group;
    const mainActor = actors[0];
    const post = notifications[0]?.post;
    const [isHovered, setIsHovered] = useState(false);

    const canExpand = actors.length > 2;

    const handleMarkRead = async () => {
        onMarkRead?.();
    };

    const handleDelete = async () => {
        onDelete?.();
    };

    const getLink = () => {
        const n = notifications[0];
        if (!n) return '#';

        if (n.type === 'follow' && mainActor?.username) return `/profile/${mainActor.username}`;
        if (n.related_entity_type === 'post' && n.related_entity_id) return `/post/${n.related_entity_id}`;
        if (n.related_entity_type === 'project' && n.related_entity_id) return projectHref(n.project?.slug || n.related_entity_id);

        return '#';
    };

    const getIcon = () => {
        switch (type) {
            case 'like': return <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />;
            case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500 fill-blue-500" />;
            case 'follow': return <UserPlus className="w-4 h-4 text-purple-500" />;
            case 'mention': return <Bell className="w-4 h-4 text-orange-500 fill-orange-500" />;
            case 'project_application': return <Briefcase className="w-4 h-4 text-green-500" />;
            default: return <Bell className="w-4 h-4 text-zinc-500" />;
        }
    };


    const content = (
        <div
            className={cn(
                "group relative flex gap-4 p-4 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                !is_read && "bg-blue-50/30 dark:bg-blue-900/10",
                isHighPriority && "border-l-2 border-blue-500 pl-[14px]" // compensate padding
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Selection Checkbox */}
            {showSelection && (
                <div
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelection?.(); }}
                    className="flex items-start pt-1.5 cursor-pointer"
                >
                    <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        isSelected
                            ? "bg-blue-500 border-blue-500 text-white"
                            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
                    )}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                </div>
            )}

            {/* Avatar Stack */}
            <div className="relative flex-shrink-0 w-12 h-12">
                {actors.length > 1 ? (
                    <div className="relative w-full h-full">
                        {actors.slice(0, 2).map((actor, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "absolute w-9 h-9 rounded-full border-2 border-white dark:border-zinc-950 overflow-hidden",
                                    i === 0 ? 'top-0 left-0 z-10' : 'bottom-0 right-0 z-0 opacity-80'
                                )}
                            >
                                <Avatar className="w-full h-full">
                                    <AvatarImage src={actor.avatar_url || undefined} alt={actor.username || "User"} />
                                    <AvatarFallback>{(actor.full_name || actor.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </div>
                        ))}
                        {actors.length > 2 && !isExpanded && (
                            <div className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-zinc-600 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-xs text-white font-bold z-20">
                                +{actors.length - 2}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-12 h-12">
                        <Avatar className="w-full h-full">
                            <AvatarImage src={mainActor?.avatar_url || undefined} alt={mainActor?.username || "User"} />
                            <AvatarFallback>{(mainActor?.full_name || mainActor?.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                )}

                {/* Icon Badge */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center shadow-sm z-30">
                    {getIcon()}
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 min-w-0">
                <div className="text-sm leading-relaxed mb-0.5">
                    {notifications[0]?.message}
                    {/* Note: using raw message for simplicity, or complex generator above if needed. 
                        Usually 'message' field is pre-composed on backend or we compose it. 
                        Let's use the straightforward message prop if reliable, or the generator logic.
                        Actually, let's use the logic that was likely there: */}
                    {/* {getMessage()} */}
                </div>

                {/* Expanded actors list */}
                {isExpanded && actors.length > 2 && (
                    <div className="mt-2 space-y-2 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800">
                        {actors.slice(2).map((actor, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                <Avatar className="w-6 h-6">
                                    <AvatarImage src={actor.avatar_url || undefined} alt={actor.username || "User"} />
                                    <AvatarFallback>{(actor.full_name || actor.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
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
                    <div className="mt-2">
                        <NotificationQuickActions
                            notificationId={notifications[0].id}
                            type={type}
                            relatedEntityId={notifications[0].related_entity_id}
                            onAction={onAction}
                        />
                    </div>
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
                <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 hidden sm:block">
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
                <Link href={getLink()} onClick={onClick} className="block">
                    {content}
                </Link>
            </SwipeableNotificationItem>
        );
    }

    return (
        <Link href={getLink()} onClick={onClick} className="block">
            {content}
        </Link>
    );
}
