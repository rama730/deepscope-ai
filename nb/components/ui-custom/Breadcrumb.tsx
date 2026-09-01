"use client";

import Link from "next/link";
import { ElementType } from "react";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbRoot {
  label: string;
  href: string;
  icon?: ElementType;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  root?: BreadcrumbRoot;
}

export default function Breadcrumb({ items, root = { label: "Hub", href: "/hub", icon: Home } }: BreadcrumbProps) {
  const RootIcon = root.icon || Home;

  return (
    <nav className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
      <Link
        href={root.href}
        className="hover:text-zinc-900 dark:text-zinc-50 dark:hover:text-zinc-100 transition-colors flex items-center gap-1"
      >
        <RootIcon className="w-4 h-4" />
        <span>{root.label}</span>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-zinc-900 dark:text-zinc-50 dark:hover:text-zinc-100 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

