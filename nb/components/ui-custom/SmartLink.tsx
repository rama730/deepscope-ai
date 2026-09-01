"use client";

import Link from "next/link";
import { useSmartPrefetch } from "@/hooks/useSmartPrefetch";

import { ComponentProps } from "react";

type SmartLinkProps = ComponentProps<typeof Link>;

/**
 * SmartLink - Prefetches routes only after a hover delay to save bandwidth.
 * Standard Next.js Link prefetches on viewport enter (too aggressive) or on hover (immediate).
 * This waits for 200ms hover before prefetching.
 */
export function SmartLink({ children, href, prefetch = false, ...props }: SmartLinkProps) {
    const { onMouseEnter, onMouseLeave } = useSmartPrefetch(href as string);

    return (
        <Link
            href={href}
            prefetch={false} // Disable default prefetch
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            {...props}
        >
            {children}
        </Link>
    );
}
