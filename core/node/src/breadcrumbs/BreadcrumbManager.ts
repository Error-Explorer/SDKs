/**
 * Breadcrumb manager for @error-explorer/node SDK
 */

import type { Breadcrumb, InternalBreadcrumb, ResolvedConfig } from '../types.js';

/**
 * Breadcrumb manager singleton
 */
class BreadcrumbManager {
  private breadcrumbs: InternalBreadcrumb[] = [];
  private maxBreadcrumbs: number = 50;

  /**
   * Initialize with configuration
   */
  init(config: ResolvedConfig): void {
    this.maxBreadcrumbs = config.breadcrumbs.maxBreadcrumbs;
    this.breadcrumbs = [];
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

    // Trim to max size
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Get all breadcrumbs (oldest first)
   */
  getAll(): InternalBreadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Get the last N breadcrumbs
   */
  getLast(count: number): InternalBreadcrumb[] {
    return this.breadcrumbs.slice(-count);
  }

  /**
   * Clear all breadcrumbs
   */
  clear(): void {
    this.breadcrumbs = [];
  }

  /**
   * Reset manager
   */
  reset(): void {
    this.breadcrumbs = [];
    this.maxBreadcrumbs = 50;
  }
}

// Singleton instance
let breadcrumbManager: BreadcrumbManager | null = null;

export function initBreadcrumbManager(config: ResolvedConfig): BreadcrumbManager {
  if (!breadcrumbManager) {
    breadcrumbManager = new BreadcrumbManager();
  }
  breadcrumbManager.init(config);
  return breadcrumbManager;
}

export function getBreadcrumbManager(): BreadcrumbManager | null {
  return breadcrumbManager;
}

export function resetBreadcrumbManager(): void {
  if (breadcrumbManager) {
    breadcrumbManager.reset();
  }
  breadcrumbManager = null;
}
