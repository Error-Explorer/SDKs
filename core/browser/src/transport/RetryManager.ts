import type { ErrorEvent, QueuedEvent } from '../types';

/**
 * Manages retry logic for failed requests
 */
export class RetryManager {
  private queue: QueuedEvent[] = [];
  private maxRetries: number;
  private processing = false;
  private sendFn: ((event: ErrorEvent) => Promise<boolean>) | null = null;

  constructor(maxRetries = 3) {
    this.maxRetries = maxRetries;
  }

  /**
   * Set the send function
   */
  setSendFunction(fn: (event: ErrorEvent) => Promise<boolean>): void {
    this.sendFn = fn;
  }

  /**
   * Add an event to the retry queue
   */
  enqueue(event: ErrorEvent): void {
    this.queue.push({
      event,
      retries: 0,
      timestamp: Date.now(),
    });

    this.processQueue();
  }

  /**
   * Process the retry queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || !this.sendFn || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];

      if (!item) {
        break;
      }

      // Check if max retries exceeded
      if (item.retries >= this.maxRetries) {
        this.queue.shift();
        continue;
      }

      // Exponential backoff
      const delay = this.calculateDelay(item.retries);
      await this.sleep(delay);

      // Try to send
      const success = await this.sendFn(item.event);

      if (success) {
        this.queue.shift();
      } else {
        item.retries++;

        // If max retries reached, remove from queue
        if (item.retries >= this.maxRetries) {
          this.queue.shift();
          console.warn('[ErrorExplorer] Max retries reached, dropping event');
        }
      }
    }

    this.processing = false;
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(retries: number): number {
    // 1s, 2s, 4s, 8s, etc. with jitter
    const baseDelay = 1000 * Math.pow(2, retries);
    const jitter = Math.random() * 1000;
    return baseDelay + jitter;
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
  }
}

// Singleton instance
let instance: RetryManager | null = null;

export function getRetryManager(): RetryManager {
  if (!instance) {
    instance = new RetryManager();
  }
  return instance;
}

export function resetRetryManager(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}
