"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { ROUTES } from "@/constants/routes";

interface BreadcrumbItem {
  label: string;
  href: string;
}

const ROUTE_LABELS: Record<string, string> = {
  "/settings": "Settings",
  "/settings/account": "Account",
  "/settings/profile": "Profile",
  "/settings/privacy": "Privacy",
  "/settings/notifications": "Notifications",
  "/settings/security": "Security",
  "/settings/appearance": "Appearance",
  "/projects": "Projects",
  "/messages": "Messages",
  "/people": "People",
  "/explorer": "Explorer",
  "/hub": "Hub",
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname) return null;

  // Don't show breadcrumbs on home or simple pages
  const hideBreadcrumbs = pathname === "/" || 
    pathname === ROUTES.EXPLORER || 
    pathname === ROUTES.HUB || 
    pathname === ROUTES.PEOPLE || 
    pathname === ROUTES.MESSAGES ||
    !pathname.includes("/") || 
    pathname.split("/").filter(Boolean).length <= 1;

  if (hideBreadcrumbs) return null;

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
  ];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = ROUTE_LABELS[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, href: currentPath });
  }

  // Don't show if only one item (just home)
  if (breadcrumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden lg:flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 px-4 py-2"
    >
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {index === 0 ? (
                <Link
                  href={crumb.href}
                  className="hover:text-zinc-900 dark:text-zinc-50 dark:hover:text-zinc-100 transition-colors"
                  aria-label="Home"
                >
                  <Home className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                  {isLast ? (
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-zinc-900 dark:text-zinc-50 dark:hover:text-zinc-100 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
