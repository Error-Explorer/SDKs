import type { ErrorEvent } from '../types';

const STORAGE_KEY = 'ee_offline_queue';
const MAX_QUEUE_SIZE = 50;

/**
 * Offline queue using localStorage
 * Stores events when offline and sends them when back online
 */
export class OfflineQueue {
  private enabled: boolean;
  private sendFn: ((event: ErrorEvent) => Promise<boolean>) | null = null;
  private onlineHandler: (() => void) | null = null;

  constructor(enabled = true) {
    this.enabled = enabled && typeof localStorage !== 'undefined';

    if (this.enabled) {
      this.setupOnlineListener();
    }
  }

  /**
   * Set the send function
   */
  setSendFunction(fn: (event: ErrorEvent) => Promise<boolean>): void {
    this.sendFn = fn;
  }

  /**
   * Check if browser is online
   */
  isOnline(): boolean {
    if (typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  }

  /**
   * Add event to offline queue
   */
  enqueue(event: ErrorEvent): void {
    if (!this.enabled) {
      return;
    }

    try {
      const queue = this.loadQueue();

      // Add to queue (FIFO)
      queue.push(event);

      // Trim if too large
      while (queue.length > MAX_QUEUE_SIZE) {
        queue.shift();
      }

      this.saveQueue(queue);
    } catch (error) {
      console.warn('[ErrorExplorer] Failed to save to offline queue:', error);
    }
  }

  /**
   * Process queued events
   */
  async flush(): Promise<void> {
    if (!this.enabled || !this.sendFn || !this.isOnline()) {
      return;
    }

    const queue = this.loadQueue();
    if (queue.length === 0) {
      return;
    }

    // Clear queue first (to avoid duplicates if page closes during flush)
    this.saveQueue([]);

    // Try to send each event
    const failed: ErrorEvent[] = [];

    for (const event of queue) {
      try {
        const success = await this.sendFn(event);
        if (!success) {
          failed.push(event);
        }
      } catch {
        failed.push(event);
      }
    }

    // Re-queue failed events
    if (failed.length > 0) {
      const currentQueue = this.loadQueue();
      this.saveQueue([...failed, ...currentQueue].slice(0, MAX_QUEUE_SIZE));
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.loadQueue().length;
  }

  /**
   * Clear the offline queue
   */
  clear(): void {
    this.saveQueue([]);
  }

  /**
   * Destroy the offline queue
   */
  destroy(): void {
    if (this.onlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
  }

  /**
   * Setup listener for online event
   */
  private setupOnlineListener(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.onlineHandler = () => {
      this.flush();
    };

    window.addEventListener('online', this.onlineHandler);
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): ErrorEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data) as ErrorEvent[];
    } catch {
      return [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(queue: ErrorEvent[]): void {
    try {
      if (queue.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      }
    } catch {
      // Storage might be full
    }
  }
}

// Singleton instance
let instance: OfflineQueue | null = null;

export function getOfflineQueue(enabled = true): OfflineQueue {
  if (!instance) {
    instance = new OfflineQueue(enabled);
  }
  return instance;
}

export function resetOfflineQueue(): void {
  if (instance) {
    instance.destroy();
  }
  instance = null;
}
