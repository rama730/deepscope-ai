"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Notification, groupNotifications } from "@/lib/utils/notifications";
import NotificationItemEnhanced from "./NotificationItemEnhanced";
import NotificationFilter, { FilterType } from "./NotificationFilter";
import { useNotifications } from "./NotificationProvider";
import { Loader2, CheckCheck, Bell, Settings, Download, Calendar, Grid3x3 } from "lucide-react";
import { useInfiniteNotifications } from "@/hooks/useInfiniteNotifications";
import NotificationSearchBar from "./NotificationSearchBar";
import NotificationSortDropdown, { SortOption } from "./NotificationSortDropdown";
import BulkActionsBar from "./BulkActionsBar";
import { NotificationSkeletonList } from "./NotificationSkeleton";
import NotificationDetailModalEnhanced from "./NotificationDetailModalEnhanced";
import NotificationRealTimeIndicator from "./NotificationRealTimeIndicator";
import NotificationExportModal from "./NotificationExportModal";
import NotificationDigestView from "./NotificationDigestView";
import NotificationStats from "./NotificationStats";
import Link from "next/link";
import { memo } from "react";
import { Virtuoso } from "react-virtuoso";

interface NotificationListProps {
    limit?: number;
    showFilters?: boolean;
    compact?: boolean;
    className?: string;
}

export default function NotificationListEnhanced({
    limit,
    showFilters = true,
    compact = false,
    className
}: NotificationListProps) {
    const [filter, setFilter] = useState<FilterType>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("newest");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    // Realtime indicator managed by provider state indirectly (or we can just show it if data changes)
    // For now, removing the double-subscription means we trust useInfiniteQuery to update due to Provider invalidation.
    // If we want the "New notifications!" pop-in, we can detect data length changes.
    const [showNewNotification, setShowNewNotification] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [showExportModal, setShowExportModal] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "digest">("list");
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const {
        markAsRead,
        markAsUnread,
        markAllAsRead,
        deleteNotification,
        deleteNotifications,
        // user-facing actions
    } = useNotifications();

    const supabase = createSupabaseBrowserClient();

    const {
        notifications,
        loading,
        loadingMore,
        error,
        loadMore,
        refresh,
    } = useInfiniteNotifications({
        limit: limit || 20,
        filter,
        searchQuery,
        sortBy,
    });

    const previousLength = useRef(notifications.length);
    useEffect(() => {
        if (notifications.length > previousLength.current && previousLength.current !== 0) {
            // New items appeared at top (assuming 'newest')
            setShowNewNotification(true);
            setTimeout(() => setShowNewNotification(false), 3000);
        }
        previousLength.current = notifications.length;
    }, [notifications.length]);

    // Removed local realtime subscription. NotificationProvider handles invalidation => react-query refetches => list updates.

    // Filter Logic
    const filteredNotifications = useMemo(() => {
        let filtered = notifications;

        // Apply additional client-side filters if needed
        if (filter === 'projects') {
            filtered = filtered.filter(n =>
                n.type === 'project_application' ||
                n.related_entity_type === 'project'
            );
        }

        return filtered;
    }, [notifications, filter]);

    // Grouping
    const groupedNotifications = useMemo(() => {
        return groupNotifications(filteredNotifications);
    }, [filteredNotifications]);

    // Sort grouped notifications
    const sortedGroupedNotifications = useMemo(() => {
        const sorted = [...groupedNotifications];

        if (sortBy === 'unread') {
            sorted.sort((a, b) => {
                if (a.is_read !== b.is_read) {
                    return a.is_read ? 1 : -1;
                }
                return new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime();
            });
        } else if (sortBy === 'oldest') {
            sorted.reverse();
        }

        return sorted;
    }, [groupedNotifications, sortBy]);

    // Handle Mark All Read
    const handleMarkAllRead = async () => {
        await markAllAsRead();
        refresh();
    };

    const handleItemClick = async (id: string, is_read: boolean) => {
        // Find notification for detail modal
        const notification = notifications.find(n => n.id === id);
        if (notification) {
            setSelectedNotification(notification);
            setShowDetailModal(true);
        }

        if (!is_read) {
            await markAsRead(id);
            // refresh(); // Provider invalidation handles this
        }
    };

    const handleNavigateNotification = (direction: 'prev' | 'next') => {
        if (!selectedNotification) return;

        const currentIndex = notifications.findIndex(n => n.id === selectedNotification.id);
        if (currentIndex === -1) return;

        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < notifications.length) {
            setSelectedNotification(notifications[nextIndex] || null);
        }
    };

    const hasPrevNotification = selectedNotification
        ? notifications.findIndex(n => n.id === selectedNotification.id) > 0
        : false;

    const hasNextNotification = selectedNotification
        ? notifications.findIndex(n => n.id === selectedNotification.id) < notifications.length - 1
        : false;

    const handleToggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === groupedNotifications.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(groupedNotifications.map(g => g.id)));
        }
    };

    const handleBulkMarkRead = async () => {
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await markAsRead(id);
        }
        setSelectedIds(new Set());
        refresh();
    };

    const handleBulkMarkUnread = async () => {
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await markAsUnread(id);
        }
        setSelectedIds(new Set());
        refresh();
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        await deleteNotifications(ids);
        setSelectedIds(new Set());
        refresh();
    };

    const handleNotificationAction = async (action: string, notificationId: string, entityId?: string) => {
        // Handle specific actions like accept/decline application
        if (action === 'accept' || action === 'decline') {
            // Call API to handle application
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !entityId) return;

            // const endpoint = action === 'accept' ? 'accept' : 'decline';
            // You would call your API endpoint here
            // await fetch(`/api/applications/${entityId}/${endpoint}`, { method: 'POST' });
        }

        // Mark notification as read after action
        await markAsRead(notificationId);
        refresh();
    };

    const handleToggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    // Virtuoso item content
    const itemContent = useCallback((index: number, group: any) => {
        const isHighPriority = group.type === 'project_application';
        const isFocused = focusedIndex === index;
        return (
            <div className={`pb-px ${isFocused ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
                <MemoizedNotificationItem
                    group={group}
                    onClick={() => {
                        setFocusedIndex(index);
                        handleItemClick(group.id, group.is_read);
                    }}
                    onAction={handleNotificationAction}
                    onMarkRead={() => markAsRead(group.id).then(() => refresh())}
                    onDelete={() => deleteNotification(group.id).then(() => refresh())}
                    isSelected={selectedIds.has(group.id)}
                    onToggleSelection={() => handleToggleSelection(group.id)}
                    isExpanded={expandedGroups.has(group.id)}
                    onToggleExpand={() => handleToggleGroup(group.id)}
                    showSelection={selectedIds.size > 0}
                    isHighPriority={isHighPriority}
                />
            </div>
        );
    }, [focusedIndex, selectedIds, expandedGroups, markAsRead, deleteNotification, refresh, handleNotificationAction, handleToggleSelection, handleToggleGroup]);


    return (
        <div className={`flex flex-col h-full ${className || ''}`}>
            {/* Real-time indicator */}
            <NotificationRealTimeIndicator show={showNewNotification} />

            {/* Header with search and sort */}
            {showFilters && !compact && (
                <div className="p-4 space-y-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
                    {/* Statistics */}
                    {notifications.length > 0 && (
                        <NotificationStats notifications={notifications} />
                    )}

                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <NotificationSearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                            />
                        </div>
                        <NotificationSortDropdown value={sortBy} onChange={setSortBy} />
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-1.5 rounded transition-colors ${viewMode === "list"
                                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300"
                                    }`}
                                aria-label="List view"
                            >
                                <Grid3x3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("digest")}
                                className={`p-1.5 rounded transition-colors ${viewMode === "digest"
                                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300"
                                    }`}
                                aria-label="Digest view"
                            >
                                <Calendar className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            aria-label="Export notifications"
                            title="Export notifications"
                        >
                            <Download className="w-5 h-5 text-zinc-500" />
                        </button>
                        <Link
                            href="/settings/notifications"
                            className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            aria-label="Notification settings"
                        >
                            <Settings className="w-5 h-5 text-zinc-500" />
                        </Link>
                    </div>

                    <div className="flex items-center justify-between">
                        <NotificationFilter
                            currentFilter={filter}
                            onFilterChange={setFilter}
                            compact={compact}
                        />
                        <div className="flex items-center gap-2">
                            {groupedNotifications.length > 0 && (
                                <button
                                    onClick={handleSelectAll}
                                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300 font-medium"
                                >
                                    {selectedIds.size === groupedNotifications.length ? 'Deselect All' : 'Select All'}
                                </button>
                            )}
                            <button
                                onClick={handleMarkAllRead}
                                title="Mark all as read"
                                className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                aria-label="Mark all as read"
                            >
                                <CheckCheck className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Compact header */}
            {showFilters && compact && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                    <NotificationFilter
                        currentFilter={filter}
                        onFilterChange={setFilter}
                        compact={compact}
                    />
                    <button
                        onClick={handleMarkAllRead}
                        title="Mark all as read"
                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                        <CheckCheck className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Bulk actions bar */}
            <BulkActionsBar
                selectedCount={selectedIds.size}
                onMarkRead={handleBulkMarkRead}
                onMarkUnread={handleBulkMarkUnread}
                onDelete={handleBulkDelete}
                onClearSelection={() => setSelectedIds(new Set())}
            />

            {/* Content */}
            <div className="flex-1 h-full min-h-0">
                {loading ? (
                    <div className="overflow-y-auto h-full">
                        <NotificationSkeletonList count={limit || 5} />
                    </div>
                ) : error ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center h-full">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-3">
                            <Bell className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                            Error loading notifications
                        </h3>
                        <p className="text-xs text-zinc-500 mb-4">{error.message}</p>
                        <button
                            onClick={() => refresh()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : sortedGroupedNotifications.length > 0 ? (
                    <>
                        {viewMode === "digest" ? (
                            <div className="p-4 overflow-y-auto h-full">
                                <NotificationDigestView notifications={filteredNotifications} groupedBy="day" />
                            </div>
                        ) : (
                            <Virtuoso
                                style={{ height: '100%' }}
                                data={sortedGroupedNotifications}
                                itemContent={itemContent}
                                endReached={loadMore}
                                components={{
                                    Footer: () => (
                                        loadingMore ? (
                                            <div className="p-4 text-center">
                                                <span className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Loading more...
                                                </span>
                                            </div>
                                        ) : null
                                    )
                                }}
                            />
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                            <Bell className="w-6 h-6 text-zinc-400" />
                        </div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {searchQuery ? 'No notifications found' : 'No notifications'}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">
                            {searchQuery
                                ? 'Try adjusting your search or filters.'
                                : "We'll notify you when something arrives."}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="mt-4 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <NotificationDetailModalEnhanced
                notification={selectedNotification}
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedNotification(null);
                }}
                onAction={handleNotificationAction}
                allNotifications={notifications}
                onNavigate={handleNavigateNotification}
                hasPrev={hasPrevNotification}
                hasNext={hasNextNotification}
                onMarkRead={(id) => markAsRead(id).then(() => refresh())}
                onMarkUnread={(id) => markAsUnread(id).then(() => refresh())}
                onDelete={(id) => deleteNotification(id).then(() => refresh())}
            />

            {/* Export Modal */}
            <NotificationExportModal
                notifications={filteredNotifications}
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
            />
        </div>
    );
}

// Memoized notification item for performance
const MemoizedNotificationItem = memo(NotificationItemEnhanced, (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
        prevProps.group.id === nextProps.group.id &&
        prevProps.group.is_read === nextProps.group.is_read &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isExpanded === nextProps.isExpanded &&
        prevProps.showSelection === nextProps.showSelection
    );
});
