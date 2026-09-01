/**
 * Performance monitoring utilities
 * Tracks Core Web Vitals and custom performance metrics
 */

export interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  feedLoadTime?: number; // Custom: Feed load time
  feedRenderTime?: number; // Custom: Feed render time
}

/**
 * Report Core Web Vitals to console (and optionally to analytics)
 */
export function reportWebVitals(metric: any) {
  const { name, value, id } = metric;
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${name}: ${value.toFixed(2)}ms`, { id });
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to analytics service
    // analytics.track('web_vital', { name, value, id });
  }
}

/**
 * Measure feed load performance
 */
export function measureFeedLoad(callback: () => Promise<void>): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now();
    callback().then(() => {
      const duration = performance.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] Feed load time: ${duration.toFixed(2)}ms`);
      }
      resolve(duration);
    });
  });
}

/**
 * Measure render performance
 */
export function measureRender(componentName: string, callback: () => void): void {
  if (typeof window === 'undefined' || !window.performance) return;

  const start = performance.now();
  callback();
  
  // Use requestAnimationFrame to measure after paint
  requestAnimationFrame(() => {
    const duration = performance.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} render: ${duration.toFixed(2)}ms`);
    }
  });
}

/**
 * Track custom performance metric
 */
export function trackMetric(name: string, value: number, unit: string = 'ms'): void {
  if (typeof window === 'undefined' || !window.performance) return;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${value.toFixed(2)}${unit}`);
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    // analytics.track('performance_metric', { name, value, unit });
  }
}

/**
 * Monitor long tasks (tasks > 50ms)
 */
export function monitorLongTasks(): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });

    return () => observer.disconnect();
  } catch (e) {
    console.warn('[Performance] Long task monitoring not supported');
    return () => {};
  }
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  if (typeof window === 'undefined' || !window.performance) {
    return {};
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');

  const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime;
  const ttfb = navigation ? navigation.responseStart - navigation.requestStart : undefined;

  return {
    fcp,
    ttfb,
  };
}
