"use client";

import { useRef, useState, TouchEvent, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SwipeableRowProps {
  children: ReactNode;
  canSwipe?: boolean;
  onSwipeLeft?: () => void;   // swipe left (drag to left)
  onSwipeRight?: () => void;  // swipe right (drag to right)
  leftLabel?: string;
  rightLabel?: string;
  leftColor?: string;  // tailwind bg class (e.g. bg-emerald-600)
  rightColor?: string; // tailwind bg class (e.g. bg-blue-600)
  className?: string;
}

const SWIPE_THRESHOLD = 80;
const MIN_SWIPE_DISTANCE = 50;

export default function SwipeableRow({
  children,
  canSwipe = true,
  onSwipeLeft,
  onSwipeRight,
  leftLabel,
  rightLabel,
  leftColor = "bg-emerald-600",
  rightColor = "bg-blue-600",
  className = "",
}: SwipeableRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeLeft, setIsSwipeLeft] = useState(false);
  const [isSwipeRight, setIsSwipeRight] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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

    // Only swipe horizontally if horizontal movement dominates.
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

  const reset = () => {
    setSwipeOffset(0);
    setIsSwipeLeft(false);
    setIsSwipeRight(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleTouchEnd = () => {
    if (!canSwipe) return;

    if (swipeOffset < -SWIPE_THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
      reset();
      return;
    }
    if (swipeOffset > SWIPE_THRESHOLD && onSwipeRight) {
      onSwipeRight();
      reset();
      return;
    }

    reset();
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <AnimatePresence>
          {isSwipeRight && onSwipeRight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center justify-start text-white px-6 ${rightColor}`}
            >
              <span className="text-sm font-semibold">{rightLabel || "Action"}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSwipeLeft && onSwipeLeft && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center justify-end text-white px-6 ml-auto ${leftColor}`}
            >
              <span className="text-sm font-semibold">{leftLabel || "Action"}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <motion.div
        className="relative"
        style={{ x: swipeOffset }}
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
          reset();
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

