"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

export function useSmartPrefetch(href: string) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onMouseEnter = useCallback(() => {
    if (!href) return;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout for 200ms
    timeoutRef.current = setTimeout(() => {
      router.prefetch(href);
    }, 200);
  }, [href, router]);

  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  // Instant prefetch method
  const prefetch = useCallback(() => {
       router.prefetch(href);
  }, [href, router]);

  return { onMouseEnter, onMouseLeave, prefetch };
}
