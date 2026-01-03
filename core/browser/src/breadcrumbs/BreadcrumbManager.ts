import type { Breadcrumb, InternalBreadcrumb, ResolvedConfig } from '../types';

/**
 * Manages breadcrumbs - a trail of events leading up to an error
 */
export class BreadcrumbManager {
  private breadcrumbs: InternalBreadcrumb[] = [];
  private maxBreadcrumbs: number;

  constructor(config: ResolvedConfig) {
    this.maxBreadcrumbs = config.breadcrumbs.maxBreadcrumbs;
  }

  /**
   * Add a breadcrumb
   */
  add(breadcrumb: Breadcrumb): void {
    const internal: InternalBreadcrumb = {
      ...breadcrumb,
      timestamp: breadcrumb.timestamp ?? Date.now(),
    };

    this.breadcrumbs.push(internal);

    // FIFO: keep only the last N breadcrumbs
    while (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Get all breadcrumbs
   */
  getAll(): InternalBreadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clear all breadcrumbs
   */
  clear(): void {
    this.breadcrumbs = [];
  }

  /**
   * Get the number of breadcrumbs
   */
  get count(): number {
    return this.breadcrumbs.length;
  }
}

// Singleton instance
let instance: BreadcrumbManager | null = null;

/**
 * Get the singleton BreadcrumbManager instance
 */
export function getBreadcrumbManager(): BreadcrumbManager | null {
  return instance;
}

/**
 * Initialize the singleton BreadcrumbManager
 */
export function initBreadcrumbManager(config: ResolvedConfig): BreadcrumbManager {
  instance = new BreadcrumbManager(config);
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetBreadcrumbManager(): void {
  instance = null;
}
