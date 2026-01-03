/**
 * Rate limiter to prevent flooding the API
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  /**
   * Create a rate limiter
   * @param maxRequests Maximum requests allowed in the time window
   * @param windowMs Time window in milliseconds
   */
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();

    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    // Check if under limit
    if (this.timestamps.length >= this.maxRequests) {
      return false;
    }

    // Record this request
    this.timestamps.push(now);
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.timestamps = [];
  }
}

// Singleton instance
let instance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!instance) {
    instance = new RateLimiter();
  }
  return instance;
}

export function resetRateLimiter(): void {
  instance = null;
}
