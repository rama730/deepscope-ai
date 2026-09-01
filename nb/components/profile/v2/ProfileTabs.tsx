"use client";

import { cn } from "@/lib/utils";
import type { ProfileTabKey } from "./types";
import { useEffect, useRef, useState } from "react";

const TABS: Array<{ key: ProfileTabKey; label: string; hint: string }> = [
  { key: "overview", label: "Overview", hint: "Bio, skills, experience" },
  { key: "portfolio", label: "Portfolio", hint: "Projects & roles" },
  { key: "activity", label: "Activity", hint: "Posts & updates" },
];

export function ProfileTabs({
  value,
  onChange,
  className,
}: {
  value: ProfileTabKey;
  onChange: (next: ProfileTabKey) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    function getHeaderHeight() {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--header-height")
        .trim();
      const px = Number.parseFloat(raw.replace("px", ""));
      return Number.isFinite(px) && px > 0 ? px : 64;
    }

    function onScroll() {
      const el = containerRef.current;
      if (!el) return;
      const headerHeight = getHeaderHeight();
      const top = el.getBoundingClientRect().top;
      // When sticky, top snaps to header height (within a small tolerance).
      setIsStuck(top <= headerHeight + 1);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        // Align to TopNav height (TopNav sets --header-height to 48px/64px based on scroll)
        // Wrapper is transparent; the rounded tab bar below owns the background/blur so corners look correct.
        "sticky top-[var(--header-height)] z-20 -mx-4 sm:mx-0 px-4 sm:px-0",
        className
      )}
    >
      <div className={cn(isStuck ? "py-0" : "py-3")}>
        <div
          className={cn(
            "border border-zinc-200 dark:border-zinc-800 p-1 flex gap-1 shadow-sm overflow-hidden",
            "bg-white/95 dark:bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-zinc-950/80",
            isStuck ? "rounded-b-2xl rounded-t-none border-t-0" : "rounded-2xl"
          )}
        >
          {TABS.map((t) => {
            const active = t.key === value;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onChange(t.key)}
                className={cn(
                  "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors text-left",
                  active
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{t.label}</span>
                  {active ? <span className="text-[11px] opacity-80 hidden sm:inline">{t.hint}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


