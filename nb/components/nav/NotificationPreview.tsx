"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { X, CheckCheck } from "lucide-react";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import NotificationListEnhanced from "@/components/notifications/NotificationList";
import { useNotificationKeyboard } from "@/hooks/useNotificationKeyboard";

export default function NotificationPreview() {
    const [isOpen, setIsOpen] = useState(false);
    const { unreadCount, markAllAsRead } = useNotifications();
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0, left: 'auto' });
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isOverDropdownRef = useRef(false);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setDropdownPosition({
                        top: rect.bottom + 8,
                        right: window.innerWidth - rect.right,
                        left: 'auto'
                    });
                }
            };
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
        return undefined;
    }, [isOpen]);

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        // Add a small delay before closing to allow mouse to move to dropdown
        closeTimeoutRef.current = setTimeout(() => {
            // Only close if mouse is not over dropdown
            if (!isOverDropdownRef.current) {
                setIsOpen(false);
            }
        }, 150);
    };

    const handleDropdownMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        isOverDropdownRef.current = true;
        setIsOpen(true);
    };

    const handleDropdownMouseLeave = () => {
        isOverDropdownRef.current = false;
        setIsOpen(false);
    };

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    // Click outside to close
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                containerRef.current &&
                !containerRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        // Use timeout to avoid immediate closing when opening
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleToggle = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    // Global keyboard shortcut
    useNotificationKeyboard({
        isOpen,
        onToggle: handleToggle,
        enabled: true,
    });

    return (
        <div
            ref={containerRef}
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={handleToggle}
                className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-zinc-950">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && typeof window !== 'undefined' && dropdownPosition.top > 0 && createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="notification-preview-dropdown fixed w-96 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-[100] flex flex-col h-[500px]"
                        style={{
                            top: `${dropdownPosition.top}px`,
                            right: `${dropdownPosition.right}px`
                        }}
                        onMouseEnter={handleDropdownMouseEnter}
                        onMouseLeave={handleDropdownMouseLeave}
                        role="menu"
                        aria-label="Notifications dropdown"
                    >
                        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</span>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                                        {unreadCount} unread
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            await markAllAsRead();
                                        }}
                                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                        aria-label="Mark all as read"
                                        title="Mark all as read"
                                    >
                                        <CheckCheck className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsOpen(false);
                                    }}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 rounded-lg transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <Link
                                    href="/notifications"
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs text-blue-600 hover:underline font-medium"
                                >
                                    View all
                                </Link>
                            </div>
                        </div>

                        <NotificationListEnhanced limit={8} showFilters={true} compact={true} />
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
