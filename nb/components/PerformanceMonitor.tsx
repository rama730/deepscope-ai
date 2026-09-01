"use client";

import { useEffect } from 'react';
import { monitorLongTasks } from '@/lib/performance';
import { useCookieConsent } from './providers/CookieProvider';

export function PerformanceMonitor() {
  const { preferences } = useCookieConsent();

  useEffect(() => {
    if (!preferences.analytics) return;

    // Monitor long tasks
    const cleanup = monitorLongTasks();

    // Report Web Vitals if available
    if (typeof window !== 'undefined' && 'web-vitals' in window) {
      // Web Vitals will be reported automatically if the library is installed
    }

    return cleanup;
  }, []);

  return null;
}
