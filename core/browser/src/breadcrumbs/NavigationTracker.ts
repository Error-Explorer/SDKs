import type { Breadcrumb } from '../types';
import { getBreadcrumbManager } from './BreadcrumbManager';

/**
 * Track navigation events (History API, hash changes)
 */
export class NavigationTracker {
  private enabled = false;
  private lastUrl: string = '';
  private popstateHandler: ((event: PopStateEvent) => void) | null = null;
  private hashchangeHandler: ((event: HashChangeEvent) => void) | null = null;
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;

  /**
   * Start tracking navigation
   */
  start(): void {
    if (this.enabled || typeof window === 'undefined') {
      return;
    }

    this.lastUrl = window.location.href;

    // Track popstate (back/forward)
    this.popstateHandler = () => {
      this.recordNavigation('popstate');
    };
    window.addEventListener('popstate', this.popstateHandler);

    // Track hash changes
    this.hashchangeHandler = () => {
      this.recordNavigation('hashchange');
    };
    window.addEventListener('hashchange', this.hashchangeHandler);

    // Wrap pushState
    this.originalPushState = history.pushState.bind(history);
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      this.originalPushState!(...args);
      this.recordNavigation('pushState');
    };

    // Wrap replaceState
    this.originalReplaceState = history.replaceState.bind(history);
    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      this.originalReplaceState!(...args);
      this.recordNavigation('replaceState');
    };

    this.enabled = true;
  }

  /**
   * Stop tracking navigation
   */
  stop(): void {
    if (!this.enabled) {
      return;
    }

    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }

    if (this.hashchangeHandler) {
      window.removeEventListener('hashchange', this.hashchangeHandler);
      this.hashchangeHandler = null;
    }

    // Restore original history methods
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
      this.originalPushState = null;
    }

    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
      this.originalReplaceState = null;
    }

    this.enabled = false;
  }

  /**
   * Record a navigation event
   */
  private recordNavigation(navigationType: string): void {
    const manager = getBreadcrumbManager();
    if (!manager) {
      return;
    }

    const currentUrl = window.location.href;
    const from = this.lastUrl;
    const to = currentUrl;

    // Don't record if URL hasn't changed
    if (from === to) {
      return;
    }

    this.lastUrl = currentUrl;

    const breadcrumb: Breadcrumb = {
      type: 'navigation',
      category: 'navigation',
      level: 'info',
      message: `Navigated to ${getPathname(to)}`,
      data: {
        from: stripOrigin(from),
        to: stripOrigin(to),
        type: navigationType,
      },
    };

    manager.add(breadcrumb);
  }
}

/**
 * Get pathname from URL
 */
function getPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Strip origin from URL, keeping path + query + hash
 */
function stripOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

// Singleton instance
let instance: NavigationTracker | null = null;

export function getNavigationTracker(): NavigationTracker {
  if (!instance) {
    instance = new NavigationTracker();
  }
  return instance;
}

export function resetNavigationTracker(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
