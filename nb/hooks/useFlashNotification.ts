import { useCallback, useEffect, useRef } from 'react';

export const useFlashNotification = () => {
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const originalTitleRef = useRef<string | null>(null);

  const stopFlashing = useCallback(() => {
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = null;
    }
  }, []);

  const startFlashing = useCallback((message: string) => {
    // If we're already flashing, don't restart everything, but maybe update message? 
    // For now, let's just ignore if already flashing to avoid weird title states, 
    // or we could stop and restart with new message.
    if (flashIntervalRef.current) return;
    
    // Only flash if document is not focused (optional, but requested behavior implies "when user is on another page")
    if (document.hasFocus()) return;

    originalTitleRef.current = document.title;
    let showNotification = true;

    flashIntervalRef.current = setInterval(() => {
      document.title = showNotification ? message : (originalTitleRef.current || 'Network for Builders');
      showNotification = !showNotification;
    }, 1000); // Flash every second
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      stopFlashing();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      stopFlashing();
    };
  }, [stopFlashing]);

  return { startFlashing, stopFlashing };
};
