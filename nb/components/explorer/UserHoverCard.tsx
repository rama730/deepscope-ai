"use client";

import React from "react";
import Link from "next/link";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Link as LinkIcon } from "lucide-react";

interface UserHoverCardProps {
    user: {
        username?: string;
        full_name?: string;
        avatar_url?: string;
        id: string;
        bio?: string;
        location?: string;
        website?: string;
        joined_at?: string; // or created_at
        followers_count?: number;
        following_count?: number;
    };
    children: React.ReactNode;
}

export const UserHoverCard = React.memo(function UserHoverCard({ user, children }: UserHoverCardProps) {
    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                {children}
            </HoverCardTrigger>
            <HoverCardContent className="w-80 p-4 shadow-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-xl">
                <div className="flex justify-between items-start">
                    <Avatar className="h-14 w-14 border-2 border-white dark:border-zinc-800 shadow-sm">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{(user.username?.[0] || "U").toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
                        size="sm"
                    >
                        Connect
                    </Button>
                </div>
                <div className="space-y-1 mt-3">
                    <Link href={`/profile/${user.username}`}>
                        <h4 className="text-sm font-bold hover:underline decoration-zinc-400 underline-offset-2">
                            {user.full_name || user.username}
                        </h4>
                    </Link>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>

                {user.bio && (
                    <p className="text-sm mt-3 line-clamp-3 leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {user.bio}
                    </p>
                )}

                <div className="flex items-center gap-x-4 mt-4 text-xs text-muted-foreground">
                    {user.location && (
                        <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{user.location}</span>
                        </div>
                    )}
                    {user.website && (
                        <div className="flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" />
                            <a href={user.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 hover:underline">
                                Website
                            </a>
                        </div>
                    )}
                    {user.joined_at && (
                        <div className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            <span>Joined {new Date(user.joined_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex gap-1 items-center hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{user.following_count || 0}</span>
                        <span className="text-xs text-muted-foreground">Following</span>
                    </div>
                    <div className="flex gap-1 items-center hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{user.followers_count || 0}</span>
                        <span className="text-xs text-muted-foreground">Followers</span>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
});
