"use client";

import { X, Compass, LayoutGrid, Users, MessageSquare, Bell, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import NotificationBadge from "./NotificationBadge";
import { Profile } from "@/types/profile";
import { ROUTES } from "@/constants/routes";

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    profile: Profile | null;

    unreadNotificationsCount?: number;
    onSignOut: () => void;
}

export default function MobileMenu({
    isOpen,
    onClose,
    profile,

    unreadNotificationsCount = 0,
    onSignOut,
}: MobileMenuProps) {
    const pathname = usePathname();

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEscape);
            return () => window.removeEventListener("keydown", handleEscape);
        }
        return undefined;
    }, [isOpen, onClose]);

    const navItems = [
        { href: ROUTES.EXPLORER, label: "Explorer", icon: Compass },
        { href: ROUTES.HUB, label: "Hub", icon: LayoutGrid },
        { href: ROUTES.PEOPLE, label: "Connections", icon: Users },
        { href: ROUTES.MESSAGES, label: "Messages", icon: MessageSquare },
        { href: ROUTES.NOTIFICATIONS, label: "Notifications", icon: Bell, badge: unreadNotificationsCount },
        { href: ROUTES.SETTINGS, label: "Settings", icon: Settings },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                onClick={onClose}
            />

            {/* Slide-out menu */}
            <div
                className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 z-50 transition-transform duration-300 lg:hidden ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-3 sm:hidden">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                                {profile?.full_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                                <div className="font-semibold text-sm truncate">{profile?.full_name || "User"}</div>
                                <div className="text-xs text-zinc-500 truncate">@{profile?.username || "username"}</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                            aria-label="Close menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onClose}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" strokeWidth={2} />
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && item.badge > 0 && (
                                            <NotificationBadge count={item.badge} />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                            onClick={() => {
                                onSignOut();
                                onClose();
                            }}
                            className="w-full px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
