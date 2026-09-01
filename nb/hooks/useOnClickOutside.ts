import { useEffect, RefObject } from 'react';

/**
 * Hook to detect clicks outside an element
 * 
 * Triggers handler when user clicks or touches outside the referenced element.
 * Useful for closing modals, dropdowns, or popovers.
 * 
 * @param ref - React ref to the element to detect outside clicks for
 * @param handler - Function to call when click occurs outside element
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useOnClickOutside(ref, () => setIsOpen(false));
 * return <div ref={ref}>Content</div>;
 * ```
 */
export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}



