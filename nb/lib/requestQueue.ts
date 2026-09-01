/**
 * Request queue with cancellation and exponential backoff
 * Manages API requests to prevent overwhelming the server
 */

export interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  priority: number;
  cancel?: () => void;
  retries: number;
  maxRetries: number;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private activeRequests: Map<string, AbortController> = new Map();
  private maxConcurrent = 5;
  private currentConcurrent = 0;

  /**
   * Add a request to the queue
   */
  async enqueue<T>(
    id: string,
    execute: () => Promise<T>,
    options: {
      priority?: number;
      maxRetries?: number;
      cancel?: () => void;
    } = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id,
        execute,
        priority: options.priority || 0,
        cancel: options.cancel,
        retries: 0,
        maxRetries: options.maxRetries || 3,
      };

      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(r => r.priority < request.priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      // Process queue
      this.processQueue();

      // Handle cancellation
      const abortController = new AbortController();
      this.activeRequests.set(id, abortController);

      // Wrap execute to handle cancellation
      const wrappedExecute = async () => {
        if (abortController.signal.aborted) {
          throw new Error('Request cancelled');
        }
        return execute();
      };

      // Store resolve/reject for later
      (request as any).resolve = resolve;
      (request as any).reject = reject;
      (request as any).execute = wrappedExecute;
    });
  }

  /**
   * Process the queue
   */
  private async processQueue() {
    while (this.currentConcurrent < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      this.currentConcurrent++;
      this.executeRequest(request).finally(() => {
        this.currentConcurrent--;
        this.processQueue();
      });
    }
  }

  /**
   * Execute a request with retry logic
   */
  private async executeRequest<T>(request: QueuedRequest<T>) {
    try {
      const result = await request.execute();
      (request as any).resolve?.(result);
    } catch (error: any) {
      // Retry with exponential backoff
      if (request.retries < request.maxRetries && !error.message?.includes('cancelled')) {
        request.retries++;
        const delay = Math.min(1000 * Math.pow(2, request.retries), 10000);
        
        setTimeout(() => {
          this.queue.unshift(request); // Add back to front of queue
          this.processQueue();
        }, delay);
      } else {
        (request as any).reject?.(error);
      }
    }
  }

  /**
   * Cancel a request
   */
  cancel(id: string) {
    const controller = this.activeRequests.get(id);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(id);
    }

    // Remove from queue
    const index = this.queue.findIndex(r => r.id === id);
    if (index !== -1) {
      const request = this.queue.splice(index, 1)[0];
      (request as any).reject?.(new Error('Request cancelled'));
    }
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.queue.forEach(request => {
      (request as any).reject?.(new Error('Queue cleared'));
    });
    this.queue = [];
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }
}

// Singleton instance
export const requestQueue = new RequestQueue();
