import { useRef, useCallback } from 'react';

/**
 * Custom hook to throttle a function
 * @param func - The function to throttle
 * @param delay - Delay in milliseconds (default: 100ms)
 * @returns Throttled function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 100
): T {
  const lastRun = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        lastRun.current = now;
        func(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          func(...args);
        }, delay - timeSinceLastRun);
      }
    }) as T,
    [func, delay]
  );
}
