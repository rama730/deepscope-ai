/**
 * Responsive design hook for adaptive UI components
 */

import { useState, useEffect } from 'react';

interface BreakpointConfig {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

export type Breakpoint = keyof BreakpointConfig;

interface UseResponsiveReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  currentBreakpoint: Breakpoint;
  isBreakpoint: (breakpoint: Breakpoint) => boolean;
  isAboveBreakpoint: (breakpoint: Breakpoint) => boolean;
  isBelowBreakpoint: (breakpoint: Breakpoint) => boolean;
}

/**
 * Hook for responsive design with breakpoint detection
 * 
 * Monitors window size and provides responsive state information.
 * Prevents mobile-first flash on SSR by initializing with desktop width.
 * 
 * @param breakpoints - Custom breakpoint configuration (optional)
 * @returns Object containing responsive state and breakpoint utilities
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop, currentBreakpoint } = useResponsive();
 * if (isMobile) return <MobileView />;
 * ```
 */
export function useResponsive(breakpoints: Partial<BreakpointConfig> = {}): UseResponsiveReturn {
  const config = { ...defaultBreakpoints, ...breakpoints };
  
  // Initialize with large width to prevent mobile-first flash on SSR
  const [screenWidth, setScreenWidth] = useState(1200);
  const [screenHeight, setScreenHeight] = useState(800);

  useEffect(() => {
    const updateDimensions = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };

    // Initial call
    updateDimensions();

    // Add event listener
    window.addEventListener('resize', updateDimensions);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const getCurrentBreakpoint = (): Breakpoint => {
    if (screenWidth >= config['2xl']) return '2xl';
    if (screenWidth >= config.xl) return 'xl';
    if (screenWidth >= config.lg) return 'lg';
    if (screenWidth >= config.md) return 'md';
    if (screenWidth >= config.sm) return 'sm';
    return 'sm';
  };

  const isBreakpoint = (breakpoint: Breakpoint): boolean => {
    return getCurrentBreakpoint() === breakpoint;
  };

  const isAboveBreakpoint = (breakpoint: Breakpoint): boolean => {
    return screenWidth >= config[breakpoint];
  };

  const isBelowBreakpoint = (breakpoint: Breakpoint): boolean => {
    return screenWidth < config[breakpoint];
  };

  return {
    isMobile: screenWidth < config.md,
    isTablet: screenWidth >= config.md && screenWidth < config.lg,
    isDesktop: screenWidth >= config.lg,
    screenWidth,
    screenHeight,
    orientation: screenWidth > screenHeight ? 'landscape' : 'portrait',
    currentBreakpoint: getCurrentBreakpoint(),
    isBreakpoint,
    isAboveBreakpoint,
    isBelowBreakpoint
  };
}

/**
 * Hook for detecting touch devices
 * 
 * Detects if the device supports touch input.
 * 
 * @returns Boolean indicating if device is touch-enabled
 * @example
 * ```tsx
 * const isTouch = useTouchDevice();
 * const interaction = isTouch ? 'tap' : 'click';
 * ```
 */
export function useTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
}

/**
 * Hook for detecting reduced motion preference
 * 
 * Detects if user prefers reduced motion (accessibility setting).
 * 
 * @returns Boolean indicating if reduced motion is preferred
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 * const animation = prefersReducedMotion ? 'none' : 'fade-in';
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook for detecting dark mode preference
 * 
 * Detects if user prefers dark color scheme.
 * 
 * @returns Boolean indicating if dark mode is preferred
 * @example
 * ```tsx
 * const prefersDark = useDarkMode();
 * const theme = prefersDark ? 'dark' : 'light';
 * ```
 */
export function useDarkMode(): boolean {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDark(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersDark;
}
