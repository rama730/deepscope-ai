"use client";

import { useState, useRef, TouchEvent } from "react";

interface SwipeableTabsProps {
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function SwipeableTabs({ tabs, activeTab, onTabChange }: SwipeableTabsProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  function onTouchStart(e: TouchEvent) {
    setTouchEnd(null);
    const touch = e.touches[0];
    if (touch) {
      setTouchStart(touch.clientX);
    }
  }

  function onTouchMove(e: TouchEvent) {
    const touch = e.touches[0];
    if (touch) {
      setTouchEnd(touch.clientX);
    }
  }

  function onTouchEnd() {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.findIndex(t => t.id === activeTab);

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        const nextTab = tabs[currentIndex + 1];
        if (nextTab) onTabChange(nextTab.id);
      } else if (isRightSwipe && currentIndex > 0) {
        const prevTab = tabs[currentIndex - 1];
        if (prevTab) onTabChange(prevTab.id);
      }
    }
  }

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="relative">
      {/* Tab Indicators */}
      <div className="flex gap-1 justify-center mb-4 md:hidden">
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            className={`h-1 rounded-full transition-all ${index === activeIndex
              ? "w-8 bg-indigo-600"
              : "w-1 bg-zinc-300 dark:bg-zinc-700"
              }`}
          />
        ))}
      </div>

      {/* Swipeable Content */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative overflow-hidden md:overflow-visible"
        style={{
          touchAction: "pan-y",
        }}
      >
        <div
          className="flex transition-transform duration-300 ease-out md:block"
          style={{
            transform: `translateX(-${activeIndex * 100}%)`,
          }}
        >
          {tabs.map(tab => (
            <div
              key={tab.id}
              className="min-w-full flex-shrink-0 md:block"
            >
              {tab.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

