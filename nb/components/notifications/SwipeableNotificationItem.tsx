"use client";

import { useState, useRef, TouchEvent, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2 } from "lucide-react";

interface SwipeableNotificationItemProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onMarkRead?: () => void;
  onDelete?: () => void;
  canSwipe?: boolean;
  className?: string;
}

const SWIPE_THRESHOLD = 80;
const MIN_SWIPE_DISTANCE = 50;

export default function SwipeableNotificationItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  onMarkRead,
  onDelete,
  canSwipe = true,
  className = "",
}: SwipeableNotificationItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeLeft, setIsSwipeLeft] = useState(false);
  const [isSwipeRight, setIsSwipeRight] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (!canSwipe) return;
    const touch = e.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!canSwipe || touchStartX.current === null || touchStartY.current === null) return;

    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Only swipe horizontally if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      setSwipeOffset(deltaX);

      if (deltaX < -MIN_SWIPE_DISTANCE) {
        setIsSwipeLeft(true);
        setIsSwipeRight(false);
      } else if (deltaX > MIN_SWIPE_DISTANCE) {
        setIsSwipeRight(true);
        setIsSwipeLeft(false);
      } else {
        setIsSwipeLeft(false);
        setIsSwipeRight(false);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!canSwipe) return;

    if (swipeOffset < -SWIPE_THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
      setSwipeOffset(0);
      setIsSwipeLeft(false);
    } else if (swipeOffset > SWIPE_THRESHOLD && onSwipeRight) {
      onSwipeRight();
      setSwipeOffset(0);
      setIsSwipeRight(false);
    } else {
      // Snap back
      setSwipeOffset(0);
      setIsSwipeLeft(false);
      setIsSwipeRight(false);
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleAction = (action: 'mark-read' | 'delete') => {
    if (action === 'mark-read' && onMarkRead) {
      onMarkRead();
    } else if (action === 'delete' && onDelete) {
      onDelete();
    }
    setSwipeOffset(0);
    setIsSwipeLeft(false);
    setIsSwipeRight(false);
  };

  return (
    <div className="relative overflow-hidden" ref={elementRef}>
      {/* Background Actions */}
      <div className="absolute inset-0 flex">
        {/* Left side - Delete (swipe right) */}
        <AnimatePresence>
          {isSwipeRight && onDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-end bg-red-500 text-white px-6"
            >
              <button
                onClick={() => handleAction('delete')}
                className="flex items-center gap-2 font-medium"
                aria-label="Delete notification"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right side - Mark Read (swipe left) */}
        <AnimatePresence>
          {isSwipeLeft && onMarkRead && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-start bg-blue-500 text-white px-6 ml-auto"
            >
              <button
                onClick={() => handleAction('mark-read')}
                className="flex items-center gap-2 font-medium"
                aria-label="Mark as read"
              >
                <Check className="w-5 h-5" />
                <span>Read</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notification Content */}
      <motion.div
        className={`relative ${className}`}
        style={{
          x: swipeOffset,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        drag={canSwipe ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -SWIPE_THRESHOLD && onSwipeLeft) {
            onSwipeLeft();
          } else if (info.offset.x > SWIPE_THRESHOLD && onSwipeRight) {
            onSwipeRight();
          }
          setSwipeOffset(0);
          setIsSwipeLeft(false);
          setIsSwipeRight(false);
        }}
        whileDrag={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
