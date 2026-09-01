
"use client";

import Link from "next/link";
import Image from "next/image";
import { NotificationGroup, formatNotificationTime } from "@/lib/utils/notifications";
import { Heart, MessageCircle, UserPlus, Briefcase, Bell } from "lucide-react";

interface NotificationItemProps {
    group: NotificationGroup;
    onClick: () => void;
}

export default function NotificationItem({ group, onClick }: NotificationItemProps) {
    const { type, actors, notifications, post, latest_at, is_read } = group;
    const count = notifications.length;
    const mainActor = actors[0];

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

    const getRandomColor = (name: string) => {
        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
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
        return '/notifications';
    };

    // Determine Text
    const renderText = () => {
        const actorName = <span className="font-semibold text-zinc-900 dark:text-zinc-100">{(mainActor as any)?.full_name || (mainActor as any)?.username || 'Unknown'}</span>;

        if (count > 1) {
            const othersCount = count - 1;
            // Group Logic
            if (type === 'like') {
                return <>{actorName} and {othersCount} others liked your post</>;
            }
            if (type === 'follow') {
                return <>{actorName} and {othersCount} others followed you</>;
            }
        }

        // Single Logic
        switch (type) {
            case 'like': return <>{actorName} liked your post</>;
            case 'comment': return <>{actorName} commented: <span className="text-zinc-600 dark:text-zinc-400">"{notifications[0]?.message || ''}"</span></>;
            case 'follow': return <>{actorName} followed you</>;
            case 'repost': return <>{actorName} reposted your post</>;
            default: return <>{notifications[0]?.message || ''}</>;
        }
    };

    return (
        <Link
            href={getLink()}
            onClick={onClick}
            className={`group relative block p-4 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${!is_read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
        >
            <div className="flex gap-4">
                {/* Avatar Section */}
                <div className="relative flex-shrink-0">
                    {actors.length > 1 ? (
                        // Stacked Avatars for groups
                        <div className="relative w-12 h-12">
                            {actors.slice(0, 2).map((actor, i) => (
                                <div key={i} className={`absolute w-9 h-9 rounded-full border-2 border-white dark:border-zinc-950 overflow-hidden ${i === 0 ? 'top-0 left-0 z-10' : 'bottom-0 right-0 z-0 opacity-80'}`}>
                                    {actor.avatar_url ? (
                                        <Image
                                            src={actor.avatar_url}
                                            alt=""
                                            width={36}
                                            height={36}
                                            className="rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center text-[10px] text-white font-bold ${getRandomColor(actor.username || 'user')}`}>
                                            {actor.username?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Single Avatar
                        <div className="w-12 h-12">
                            {mainActor?.avatar_url ? (
                                <Image
                                    src={mainActor.avatar_url}
                                    alt=""
                                    width={48}
                                    height={48}
                                    className="rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
                                />
                            ) : (
                                <div className={`w-full h-full rounded-full flex items-center justify-center text-sm text-white font-bold ${getRandomColor(mainActor?.username || 'user')}`}>
                                    {mainActor?.username?.[0]?.toUpperCase()}
                                </div>
                            )}
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
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-xs text-zinc-400 font-medium">
                            {formatNotificationTime(latest_at)}
                        </p>
                        {!is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                        )}
                    </div>
                </div>

                {/* Media Preview (Right Side) */}
                {post?.media?.urls?.[0] && post.media.type === 'image' && (
                    <div className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                        <Image
                            src={post.media.urls[0]}
                            alt="Post media"
                            fill
                            className="object-cover"
                        />
                    </div>
                )}
            </div>
        </Link>
    );
}
