"use client";

import { useState, useRef, TouchEvent } from "react";
import { Check, X } from "lucide-react";

interface SwipeableConnectionRequestProps {
    children: React.ReactNode;
    onAccept?: () => void;
    onDecline?: () => void;
    onCancel?: () => void;
    actionType?: "accept/decline" | "cancel";
    disabled?: boolean;
}

export default function SwipeableConnectionRequest({
    children,
    onAccept,
    onDecline,
    onCancel,
    actionType = "accept/decline",
    disabled = false
}: SwipeableConnectionRequestProps) {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const minSwipeDistance = 80;

    function onTouchStart(e: TouchEvent) {
        if (disabled) return;
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0]?.clientX ?? null);
    }

    function onTouchMove(e: TouchEvent) {
        if (disabled || touchStart === null) return;
        const currentTouch = e.targetTouches[0]?.clientX;
        if (currentTouch === undefined) return;
        setTouchEnd(currentTouch);
        const distance = touchStart - currentTouch;
        
        // Limit swipe distance
        if (Math.abs(distance) < 150) {
            setSwipeOffset(distance);
        }
    }

    function onTouchEnd() {
        if (disabled || touchStart === null || touchEnd === null) {
            setSwipeOffset(0);
            return;
        }

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && actionType === "accept/decline" && onDecline) {
            onDecline();
        } else if (isRightSwipe && actionType === "accept/decline" && onAccept) {
            onAccept();
        } else if ((isLeftSwipe || isRightSwipe) && actionType === "cancel" && onCancel) {
            onCancel();
        }

        setSwipeOffset(0);
        setTouchStart(null);
        setTouchEnd(null);
    }

    const showAcceptAction = actionType === "accept/decline" && swipeOffset < -50;
    const showDeclineAction = actionType === "accept/decline" && swipeOffset > 50;
    const showCancelAction = actionType === "cancel" && Math.abs(swipeOffset) > 50;

    return (
        <div className="relative overflow-hidden" ref={containerRef}>
            {/* Action backgrounds */}
            {(showAcceptAction || showCancelAction) && (
                <div className="absolute inset-y-0 right-0 bg-green-500 flex items-center justify-start pl-4 z-0 w-20">
                    <Check className="w-6 h-6 text-white" />
                </div>
            )}
            {showDeclineAction && (
                <div className="absolute inset-y-0 left-0 bg-red-500 flex items-center justify-end pr-4 z-0 w-20">
                    <X className="w-6 h-6 text-white" />
                </div>
            )}

            {/* Content */}
            <div
                className="relative z-10 transition-transform duration-200"
                style={{
                    transform: `translateX(${swipeOffset}px)`,
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {children}
            </div>
        </div>
    );
}
