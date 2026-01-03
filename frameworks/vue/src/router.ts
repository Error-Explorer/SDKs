/**
 * Vue Router integration for Error Explorer
 * Adds navigation breadcrumbs automatically
 */

import type { Router, RouteLocationNormalized } from 'vue-router';
import { ErrorExplorer } from '@error-explorer/browser';

/**
 * Router integration options
 */
export interface RouterIntegrationOptions {
  /**
   * Track route changes as breadcrumbs
   * @default true
   */
  trackNavigation?: boolean;

  /**
   * Track route params in breadcrumbs
   * @default false (may contain sensitive data)
   */
  trackParams?: boolean;

  /**
   * Track query parameters in breadcrumbs
   * @default false (may contain sensitive data)
   */
  trackQuery?: boolean;

  /**
   * Custom function to extract route name for breadcrumb
   */
  getRouteName?: (route: RouteLocationNormalized) => string;

  /**
   * Hook called before adding navigation breadcrumb
   * Return false to skip the breadcrumb
   */
  beforeNavigationBreadcrumb?: (
    from: RouteLocationNormalized,
    to: RouteLocationNormalized
  ) => boolean;
}

/**
 * Default route name extractor
 */
function defaultGetRouteName(route: RouteLocationNormalized): string {
  if (route.name && typeof route.name === 'string') {
    return route.name;
  }

  // Use path as fallback
  return route.path || '/';
}

/**
 * Build route data for breadcrumb
 */
function buildRouteData(
  route: RouteLocationNormalized,
  options: RouterIntegrationOptions
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    path: route.path,
    name: route.name,
    fullPath: route.fullPath,
  };

  if (options.trackParams && Object.keys(route.params).length > 0) {
    data.params = { ...route.params };
  }

  if (options.trackQuery && Object.keys(route.query).length > 0) {
    data.query = { ...route.query };
  }

  if (route.meta && Object.keys(route.meta).length > 0) {
    // Only include safe meta properties
    const safeMeta: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(route.meta)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        safeMeta[key] = value;
      }
    }
    if (Object.keys(safeMeta).length > 0) {
      data.meta = safeMeta;
    }
  }

  return data;
}

/**
 * Setup Vue Router integration
 */
export function setupRouterIntegration(
  router: Router,
  options: RouterIntegrationOptions = {}
): () => void {
  if (options.trackNavigation === false) {
    return () => {};
  }

  const getRouteName = options.getRouteName || defaultGetRouteName;

  // Track navigation start time
  let navigationStartTime: number | null = null;

  // Before each navigation
  const beforeEachGuard = router.beforeEach((to, from) => {
    navigationStartTime = performance.now();

    // Add breadcrumb for navigation start
    if (from.name || from.path !== '/') {
      const shouldAdd = options.beforeNavigationBreadcrumb
        ? options.beforeNavigationBreadcrumb(from, to)
        : true;

      if (shouldAdd) {
        ErrorExplorer.addBreadcrumb({
          type: 'navigation',
          category: 'router',
          message: `Navigating from ${getRouteName(from)} to ${getRouteName(to)}`,
          level: 'info',
          data: {
            from: buildRouteData(from, options),
            to: buildRouteData(to, options),
          },
        });
      }
    }

    return true;
  });

  // After each navigation
  const afterEachGuard = router.afterEach((to, from, failure) => {
    const duration = navigationStartTime ? performance.now() - navigationStartTime : undefined;
    navigationStartTime = null;

    if (failure) {
      // Navigation failed
      ErrorExplorer.addBreadcrumb({
        type: 'navigation',
        category: 'router.error',
        message: `Navigation failed to ${getRouteName(to)}`,
        level: 'error',
        data: {
          to: buildRouteData(to, options),
          error: failure.message,
          type: failure.type,
          duration,
        },
      });

      // Capture as exception if it's a real error
      if (failure.type !== 4) { // Not aborted
        ErrorExplorer.captureException(failure, {
          tags: {
            'router.error': 'navigation_failure',
            'router.to': getRouteName(to),
          },
        });
      }
    } else {
      // Navigation succeeded
      ErrorExplorer.addBreadcrumb({
        type: 'navigation',
        category: 'router',
        message: `Navigated to ${getRouteName(to)}`,
        level: 'info',
        data: {
          route: buildRouteData(to, options),
          duration,
        },
      });
    }
  });

  // Handle router errors
  const errorHandler = router.onError((error) => {
    ErrorExplorer.addBreadcrumb({
      type: 'error',
      category: 'router.error',
      message: error.message,
      level: 'error',
    });

    ErrorExplorer.captureException(error, {
      tags: {
        'router.error': 'unhandled',
      },
    });
  });

  // Return cleanup function
  return () => {
    beforeEachGuard();
    afterEachGuard();
    errorHandler();
  };
}

/**
 * Create a Vue Router plugin that integrates with Error Explorer
 */
export function createRouterIntegration(options: RouterIntegrationOptions = {}) {
  let cleanup: (() => void) | null = null;

  return {
    /**
     * Install the router integration
     */
    install(router: Router): void {
      cleanup = setupRouterIntegration(router, options);
    },

    /**
     * Uninstall the router integration
     */
    uninstall(): void {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    },
  };
}

export type { Router, RouteLocationNormalized };
