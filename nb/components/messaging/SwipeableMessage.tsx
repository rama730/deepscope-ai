"use client";

import { useRef, useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reply, Trash2 } from "lucide-react";

interface SwipeableMessageProps {
    children: ReactNode;
    onSwipeRight?: () => void;
    onSwipeLeft?: () => void;
    onLongPress?: () => void;
    disabled?: boolean;
    className?: string;
}

export function SwipeableMessage({
    children,
    onSwipeRight,
    onSwipeLeft,
    onLongPress,
    disabled = false,
    className
}: SwipeableMessageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    const SWIPE_THRESHOLD = 100;
    const MAX_SWIPE = 120;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled || e.touches.length === 0) return;
        const touch = e.touches[0];
        if (!touch) return;
        setStartX(touch.clientX);
        setIsDragging(true);

        // Long press detection
        if (onLongPress) {
            longPressTimerRef.current = setTimeout(() => {
                onLongPress();
            }, 500);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (disabled || !isDragging || e.touches.length === 0) return;

        // Clear long press timer if user moves
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        const touch = e.touches[0];
        if (!touch) return;
        const deltaX = touch.clientX - startX;
        const newOffset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
        setSwipeOffset(newOffset);
    };

    const handleTouchEnd = () => {
        if (disabled || !isDragging) return;

        // Clear long press timer
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (Math.abs(swipeOffset) > SWIPE_THRESHOLD) {
            if (swipeOffset > 0 && onSwipeRight) {
                onSwipeRight();
            } else if (swipeOffset < 0 && onSwipeLeft) {
                onSwipeLeft();
            }
        }

        // Reset
        setSwipeOffset(0);
        setIsDragging(false);
        setStartX(0);
    };

    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    // Determine which action to show
    const showRightAction = swipeOffset > 20 && onSwipeRight;
    const showLeftAction = swipeOffset < -20 && onSwipeLeft;

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden", className)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Left action (swipe right) */}
            {showRightAction && (
                <div
                    className="absolute left-0 top-0 bottom-0 flex items-center justify-start pl-4 bg-primary text-primary-foreground z-10"
                    style={{ width: `${Math.min(MAX_SWIPE, Math.abs(swipeOffset))}px` }}
                >
                    <Reply className="h-5 w-5" />
                </div>
            )}

            {/* Right action (swipe left) */}
            {showLeftAction && (
                <div
                    className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-4 bg-destructive text-destructive-foreground z-10"
                    style={{ width: `${Math.min(MAX_SWIPE, Math.abs(swipeOffset))}px` }}
                >
                    <Trash2 className="h-5 w-5" />
                </div>
            )}

            {/* Content */}
            <div
                className={cn(
                    "transition-transform duration-200",
                    isDragging && "transition-none"
                )}
                style={{
                    transform: `translateX(${swipeOffset}px)`,
                    touchAction: 'pan-y'
                }}
            >
                {children}
            </div>
        </div>
    );
}
