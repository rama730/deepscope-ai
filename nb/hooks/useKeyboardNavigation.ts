/**
 * Keyboard navigation hook for enhanced accessibility
 */

import { useEffect, useCallback, useRef } from 'react';

/**
 * Options for keyboard navigation hook
 */
interface KeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (shiftKey: boolean) => void;
  onSpace?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
  enabled?: boolean;
  preventDefault?: string[]; // Keys to prevent default for
}

/**
 * Hook for keyboard navigation with customizable handlers
 * 
 * Provides keyboard event handling for common navigation keys (arrows, home, end, etc.)
 * with support for preventing default behavior and custom handlers.
 * 
 * @param options - Configuration object with keyboard event handlers
 * @returns Object containing handleKeyDown function
 * @example
 * ```tsx
 * useKeyboardNavigation({
 *   onArrowDown: () => selectNext(),
 *   onArrowUp: () => selectPrevious(),
 *   onEscape: () => close()
 * });
 * ```
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onSpace,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    enabled = true,
    preventDefault = []
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, shiftKey, ctrlKey, metaKey, altKey } = event;

    // Prevent default if specified
    if (preventDefault.includes(key)) {
      event.preventDefault();
    }

    // Don't handle if modifier keys are pressed (except Shift for Tab)
    if ((ctrlKey || metaKey || altKey) && key !== 'Tab') return;

    switch (key) {
      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
      
      case 'Enter':
        if (onEnter) {
          event.preventDefault();
          onEnter();
        }
        break;
      
      case 'ArrowUp':
        if (onArrowUp) {
          event.preventDefault();
          onArrowUp();
        }
        break;
      
      case 'ArrowDown':
        if (onArrowDown) {
          event.preventDefault();
          onArrowDown();
        }
        break;
      
      case 'ArrowLeft':
        if (onArrowLeft) {
          event.preventDefault();
          onArrowLeft();
        }
        break;
      
      case 'ArrowRight':
        if (onArrowRight) {
          event.preventDefault();
          onArrowRight();
        }
        break;
      
      case 'Tab':
        if (onTab) {
          onTab(shiftKey);
        }
        break;
      
      case ' ':
        if (onSpace) {
          event.preventDefault();
          onSpace();
        }
        break;
      
      case 'Home':
        if (onHome) {
          event.preventDefault();
          onHome();
        }
        break;
      
      case 'End':
        if (onEnd) {
          event.preventDefault();
          onEnd();
        }
        break;
      
      case 'PageUp':
        if (onPageUp) {
          event.preventDefault();
          onPageUp();
        }
        break;
      
      case 'PageDown':
        if (onPageDown) {
          event.preventDefault();
          onPageDown();
        }
        break;
    }
  }, [
    enabled,
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onSpace,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault
  ]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return { handleKeyDown };
}

/**
 * Hook for managing focus trap (useful for modals)
 * 
 * Traps focus within a container element, preventing tab navigation outside.
 * Automatically focuses first element when activated and restores focus on deactivation.
 * 
 * @param isActive - Whether focus trap is active (default: true)
 * @returns Object containing container ref and focus management functions
 * @example
 * ```tsx
 * const { containerRef, focusFirst } = useFocusTrap(isModalOpen);
 * return <div ref={containerRef}>Modal content</div>;
 * ```
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter(el => {
      // Check if element is visible
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, [getFocusableElements]);

  const handleTabKey = useCallback((shiftKey: boolean) => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (shiftKey) {
      // Shift + Tab
      if (activeElement === firstElement) {
        lastElement.focus();
        return true; // Indicate we handled the event
      }
    } else {
      // Tab
      if (activeElement === lastElement) {
        firstElement.focus();
        return true; // Indicate we handled the event
      }
    }

    return false; // Let default behavior happen
  }, [getFocusableElements]);

  useKeyboardNavigation({
    enabled: isActive,
    onTab: (shiftKey) => {
      if (handleTabKey(shiftKey)) {
        // We handled the tab, prevent default
      }
    }
  });

  useEffect(() => {
    if (isActive) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus first element
      setTimeout(focusFirst, 0);
    } else {
      // Restore previous focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isActive, focusFirst]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    getFocusableElements
  };
}

/**
 * Hook for managing roving tabindex (useful for lists)
 * 
 * Implements roving tabindex pattern for keyboard navigation in lists.
 * Only one item has tabindex=0 at a time, with arrow keys moving focus.
 * 
 * @param items - Array of HTML elements to manage
 * @param activeIndex - Currently active/focused item index
 * @param onActiveIndexChange - Callback when active index changes
 * @param options - Configuration options (loop, orientation)
 * @returns Object containing navigation functions
 * @example
 * ```tsx
 * const { moveToNext, moveToPrevious } = useRovingTabIndex(
 *   itemRefs,
 *   activeIndex,
 *   setActiveIndex,
 *   { loop: true, orientation: 'vertical' }
 * );
 * ```
 */
export function useRovingTabIndex<T extends HTMLElement>(
  items: T[],
  activeIndex: number,
  onActiveIndexChange: (index: number) => void,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
  } = {}
) {
  const { loop = true, orientation = 'vertical' } = options;

  const moveToNext = useCallback(() => {
    const nextIndex = activeIndex + 1;
    if (nextIndex < items.length) {
      onActiveIndexChange(nextIndex);
    } else if (loop) {
      onActiveIndexChange(0);
    }
  }, [activeIndex, items.length, onActiveIndexChange, loop]);

  const moveToPrevious = useCallback(() => {
    const prevIndex = activeIndex - 1;
    if (prevIndex >= 0) {
      onActiveIndexChange(prevIndex);
    } else if (loop) {
      onActiveIndexChange(items.length - 1);
    }
  }, [activeIndex, items.length, onActiveIndexChange, loop]);

  const moveToFirst = useCallback(() => {
    onActiveIndexChange(0);
  }, [onActiveIndexChange]);

  const moveToLast = useCallback(() => {
    onActiveIndexChange(items.length - 1);
  }, [items.length, onActiveIndexChange]);

  useKeyboardNavigation({
    onArrowDown: orientation === 'vertical' || orientation === 'both' ? moveToNext : undefined,
    onArrowUp: orientation === 'vertical' || orientation === 'both' ? moveToPrevious : undefined,
    onArrowRight: orientation === 'horizontal' || orientation === 'both' ? moveToNext : undefined,
    onArrowLeft: orientation === 'horizontal' || orientation === 'both' ? moveToPrevious : undefined,
    onHome: moveToFirst,
    onEnd: moveToLast,
    preventDefault: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
  });

  // Update tabindex for all items
  useEffect(() => {
    items.forEach((item, index) => {
      if (item) {
        item.tabIndex = index === activeIndex ? 0 : -1;
        if (index === activeIndex) {
          item.focus();
        }
      }
    });
  }, [items, activeIndex]);

  return {
    moveToNext,
    moveToPrevious,
    moveToFirst,
    moveToLast
  };
}
