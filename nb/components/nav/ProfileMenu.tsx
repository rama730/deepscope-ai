"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Profile } from "@/types/profile";
import { ROUTES, getProfileRoute } from "@/constants/routes";
import { LogOut, User, Settings } from "lucide-react";

interface ProfileMenuProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export default function ProfileMenu({ profile, isOpen, onClose, onSignOut }: ProfileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const menuItemsRef = useRef<(HTMLAnchorElement | HTMLButtonElement)[]>([]);

  // Calculate menu position to prevent overflow
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let right = 0;
      let top = 8; // Default margin from trigger

      // Check if menu would overflow right edge
      if (rect.right > viewportWidth - 16) {
        right = viewportWidth - rect.right - 16;
      }

      // Check if menu would overflow bottom edge
      if (rect.bottom > viewportHeight - 16) {
        top = viewportHeight - rect.bottom - 16;
      }

      setMenuPosition({ top, right });
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < menuItemsRef.current.length - 1 ? prev + 1 : 0;
          menuItemsRef.current[next]?.focus();
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : menuItemsRef.current.length - 1;
          menuItemsRef.current[next]?.focus();
          return next;
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        setFocusedIndex(0);
        menuItemsRef.current[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        const lastIndex = menuItemsRef.current.length - 1;
        setFocusedIndex(lastIndex);
        menuItemsRef.current[lastIndex]?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && menuItemsRef.current[0]) {
      // Small delay to ensure menu is rendered
      setTimeout(() => {
        menuItemsRef.current[0]?.focus();
        setFocusedIndex(0);
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;



  const handleItemClick = () => {
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50"
      style={menuPosition ? { top: `${menuPosition.top}px`, right: `${menuPosition.right}px` } : undefined}
      role="menu"
      aria-label="User menu"
    >
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="font-semibold text-sm truncate">
          {profile?.full_name || "User"}
        </div>
        <div className="text-xs text-zinc-500 truncate">
          @{profile?.username || "username"}
        </div>
      </div>
      <div className="p-2 space-y-1">
        <Link
          href={profile?.id ? getProfileRoute(profile.id) : ROUTES.PROFILE}
          onClick={handleItemClick}
          ref={(el) => {
            if (el) menuItemsRef.current[0] = el;
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          role="menuitem"
          tabIndex={focusedIndex === 0 ? 0 : -1}
        >
          <User className="w-4 h-4" />
          <span>My Profile</span>
        </Link>
        <Link
          href={ROUTES.SETTINGS}
          onClick={handleItemClick}
          ref={(el) => {
            if (el) menuItemsRef.current[1] = el;
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          role="menuitem"
          tabIndex={focusedIndex === 1 ? 0 : -1}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
        <hr className="my-1 border-zinc-100 dark:border-zinc-800" />
        <button
          onClick={() => {
            onSignOut();
            handleItemClick();
          }}
          ref={(el) => {
            if (el) menuItemsRef.current[2] = el;
          }}
          className="w-full flex items-center gap-3 text-left rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          role="menuitem"
          tabIndex={focusedIndex === 2 ? 0 : -1}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

// Avatar component with image support
export function ProfileAvatar({
  profile,
  size = 32,
  priority = false,
}: {
  profile: Profile | null;
  size?: number;
  priority?: boolean;
}) {
  const profileInitial =
    profile?.full_name?.[0]?.toUpperCase() ||
    profile?.username?.[0]?.toUpperCase() ||
    "U";

  if (profile?.avatar_url) {
    return (
      <div className="relative rounded-full overflow-hidden ring-2 ring-white dark:ring-zinc-950 group-hover:ring-blue-100 dark:group-hover:ring-blue-900/30 transition-all" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Image
          src={profile.avatar_url}
          alt={profile.full_name || profile.username || "User"}
          fill
          sizes={`${size}px`}
          // Use eager/high fetch without injecting a <link rel="preload">, which can be noisy in dev.
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="object-cover"
          onError={(e) => {
            // Fallback to initials on error - next/image doesn't support onError same way as img for this specific DOM manipulation logic easily without state
            // Keeping simple for now or using unoptimized if needed strictly, but let's try standard Image
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              const fallback = parent.querySelector(".avatar-fallback") as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }
          }}
        />
        <div className="avatar-fallback absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-semibold text-white" style={{ display: "none" }}>
          {profileInitial}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-semibold text-white ring-2 ring-white dark:ring-zinc-950 group-hover:ring-blue-100 dark:group-hover:ring-blue-900/30 transition-all"
      style={{ width: size, height: size }}
    >
      {profileInitial}
    </div>
  );
}
