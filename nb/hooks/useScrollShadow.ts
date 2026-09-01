import { useEffect, useState } from "react";

/**
 * Hook to detect scroll position for shadow effects
 * 
 * Monitors window scroll position and returns whether user has scrolled
 * past the threshold. Useful for showing/hiding shadows on fixed headers.
 * 
 * @param threshold - Scroll threshold in pixels (default: 10)
 * @returns Boolean indicating if user has scrolled past threshold
 * @example
 * ```tsx
 * const hasScrolled = useScrollShadow(20);
 * <header className={hasScrolled ? 'shadow-md' : ''}>Header</header>
 * ```
 */
export function useScrollShadow(threshold = 10): boolean {
    const [hasScrolled, setHasScrolled] = useState(false);

    useEffect(() => {
        let ticking = false;
        
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrolled = window.scrollY > threshold;
                    if (scrolled !== hasScrolled) {
                        setHasScrolled(scrolled);
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll(); // Check initial state

        return () => window.removeEventListener("scroll", handleScroll);
    }, [hasScrolled, threshold]);

    return hasScrolled;
}
