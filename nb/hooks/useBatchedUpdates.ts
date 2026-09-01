import { useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to batch updates over a time window
 * Useful for real-time updates that may come in rapid succession
 */
export function useBatchedUpdates<T>(
  callback: (items: T[]) => void,
  delay: number = 500
): (item: T) => void {
  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(() => {
    if (batchRef.current.length > 0) {
      const items = [...batchRef.current];
      batchRef.current = [];
      callback(items);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [callback]);

  const addToBatch = useCallback((item: T) => {
    batchRef.current.push(item);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      flush();
    }, delay);
  }, [delay, flush]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      flush();
    };
  }, [flush]);

  return addToBatch;
}
