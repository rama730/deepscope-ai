/**
 * Lightweight performance measurement utility
 * Tracks timings, request counts, and subscription counts for performance analysis
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  requestCount: number;
  subscriptionCount: number;
  timestamp: number;
}

class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private requestCount: number = 0;
  private subscriptionCount: number = 0;
  private enabled: boolean = true;

  constructor() {
    // Only enable in development or when explicitly enabled
    if (typeof window !== 'undefined') {
      this.enabled = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('perf-tracking') === 'true';
    }
  }

  /**
   * Start tracking a performance metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End tracking a performance metric
   */
  end(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[Perf] Metric "${name}" not found`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    this.metrics.set(name, {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...metadata },
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`, metadata || '');
    }
  }

  /**
   * Increment request counter
   */
  incrementRequest(): void {
    if (!this.enabled) return;
    this.requestCount++;
  }

  /**
   * Set subscription count
   */
  setSubscriptionCount(count: number): void {
    if (!this.enabled) return;
    this.subscriptionCount = count;
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics as a report
   */
  getReport(): PerformanceReport {
    return {
      metrics: Array.from(this.metrics.values()),
      requestCount: this.requestCount,
      subscriptionCount: this.subscriptionCount,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.requestCount = 0;
    this.subscriptionCount = 0;
  }

  /**
   * Get summary for a specific flow
   */
  getFlowSummary(flowName: string): {
    totalDuration?: number;
    metrics: PerformanceMetric[];
  } {
    const flowMetrics = Array.from(this.metrics.values()).filter(
      (m) => m.name.startsWith(flowName)
    );

    const totalDuration = flowMetrics
      .filter((m) => m.duration !== undefined)
      .reduce((sum, m) => sum + (m.duration || 0), 0);

    return {
      totalDuration: totalDuration > 0 ? totalDuration : undefined,
      metrics: flowMetrics,
    };
  }
}

// Singleton instance
export const perfTracker = new PerformanceTracker();

// Convenience hooks for React
export function usePerformanceTracking() {
  return {
    start: (name: string, metadata?: Record<string, any>) =>
      perfTracker.start(name, metadata),
    end: (name: string, metadata?: Record<string, any>) =>
      perfTracker.end(name, metadata),
    getReport: () => perfTracker.getReport(),
    getFlowSummary: (flowName: string) => perfTracker.getFlowSummary(flowName),
  };
}

// Export types
export type { PerformanceMetric, PerformanceReport };
