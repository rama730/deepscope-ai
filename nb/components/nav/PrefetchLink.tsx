"use client";

import Link, { LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ReactNode, useCallback } from "react";

interface PrefetchLinkProps extends LinkProps {
    children: ReactNode;
    className?: string;
    prefetchFn?: (queryClient: any) => Promise<void>;
}

export function PrefetchLink({
    children,
    prefetchFn,
    onMouseEnter,
    onTouchStart,
    ...props
}: PrefetchLinkProps & React.ComponentPropsWithoutRef<"a">) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const handlePrefetch = useCallback(() => {
        // Prefetch Next.js route
        router.prefetch(String(props.href));

        // Prefetch Data if function provided
        if (prefetchFn) {
            prefetchFn(queryClient).catch(err => {
                // Silently fail - prefetch shouldn't break UI
                if (process.env.NODE_ENV === 'development') {
                    console.warn("Prefetch error:", err);
                }
            });
        }
    }, [router, queryClient, props.href, prefetchFn]);

    return (
        <Link
            {...props}
            onMouseEnter={(e) => {
                handlePrefetch();
                onMouseEnter?.(e);
            }}
            onTouchStart={(e) => {
                handlePrefetch();
                onTouchStart?.(e);
            }}
        >
            {children}
        </Link>
    );
}
