/**
 * React Router integration for Error Explorer
 *
 * Tracks navigation events as breadcrumbs.
 */

import React, { useEffect, useRef } from 'react';
import { ErrorExplorer } from '@error-explorer/browser';

/**
 * Router integration options
 */
export interface RouterIntegrationOptions {
  /**
   * Track navigation events as breadcrumbs
   * @default true
   */
  trackNavigation?: boolean;

  /**
   * Include URL parameters in breadcrumbs
   * @default false (for privacy)
   */
  trackParams?: boolean;

  /**
   * Include query string in breadcrumbs
   * @default false (for privacy)
   */
  trackQuery?: boolean;

  /**
   * Include hash in breadcrumbs
   * @default false
   */
  trackHash?: boolean;
}

const defaultOptions: Required<RouterIntegrationOptions> = {
  trackNavigation: true,
  trackParams: false,
  trackQuery: false,
  trackHash: false,
};

/**
 * Hook to track React Router navigation
 *
 * Compatible with React Router v6+
 *
 * @example
 * ```tsx
 * import { useLocation } from 'react-router-dom';
 * import { useRouterBreadcrumbs } from '@error-explorer/react/router';
 *
 * function App() {
 *   const location = useLocation();
 *   useRouterBreadcrumbs(location);
 *
 *   return <Routes>...</Routes>;
 * }
 * ```
 */
export function useRouterBreadcrumbs(
  location: { pathname: string; search?: string; hash?: string },
  options: RouterIntegrationOptions = {}
) {
  const opts = { ...defaultOptions, ...options };
  const previousLocation = useRef<string | null>(null);

  useEffect(() => {
    if (!opts.trackNavigation) return;

    // Build the URL to track
    let url = location.pathname;
    if (opts.trackQuery && location.search) {
      url += location.search;
    }
    if (opts.trackHash && location.hash) {
      url += location.hash;
    }

    // Skip if same as previous
    if (previousLocation.current === url) return;

    const from = previousLocation.current;
    previousLocation.current = url;

    // Add breadcrumb
    ErrorExplorer.addBreadcrumb({
      type: 'navigation',
      category: 'navigation',
      message: from ? `Navigated to ${url}` : `Initial page: ${url}`,
      level: 'info',
      data: {
        from: from || undefined,
        to: url,
      },
    });
  }, [location.pathname, location.search, location.hash, opts]);
}

/**
 * Create a navigation listener for React Router
 *
 * Use this with the router's subscribe/listen functionality.
 *
 * @example
 * ```tsx
 * import { createBrowserRouter } from 'react-router-dom';
 * import { createNavigationListener } from '@error-explorer/react/router';
 *
 * const router = createBrowserRouter([...routes]);
 * const unsubscribe = createNavigationListener(router);
 *
 * // Cleanup when needed
 * // unsubscribe();
 * ```
 */
export function createNavigationListener(
  router: { subscribe: (callback: (state: { location: { pathname: string; search: string; hash: string } }) => void) => () => void },
  options: RouterIntegrationOptions = {}
): () => void {
  const opts = { ...defaultOptions, ...options };
  let previousPath: string | null = null;

  return router.subscribe((state) => {
    if (!opts.trackNavigation) return;

    const { pathname, search, hash } = state.location;

    // Build the URL to track
    let url = pathname;
    if (opts.trackQuery && search) {
      url += search;
    }
    if (opts.trackHash && hash) {
      url += hash;
    }

    // Skip if same as previous
    if (previousPath === url) return;

    const from = previousPath;
    previousPath = url;

    ErrorExplorer.addBreadcrumb({
      type: 'navigation',
      category: 'navigation',
      message: from ? `Navigated to ${url}` : `Initial page: ${url}`,
      level: 'info',
      data: {
        from: from || undefined,
        to: url,
      },
    });
  });
}

/**
 * Higher-order component to wrap router with breadcrumb tracking
 *
 * @example
 * ```tsx
 * import { BrowserRouter } from 'react-router-dom';
 * import { withRouterTracking } from '@error-explorer/react/router';
 *
 * const TrackedRouter = withRouterTracking(BrowserRouter);
 *
 * function App() {
 *   return (
 *     <TrackedRouter>
 *       <Routes>...</Routes>
 *     </TrackedRouter>
 *   );
 * }
 * ```
 */
export function withRouterTracking<P extends object>(
  RouterComponent: React.ComponentType<P>,
  options: RouterIntegrationOptions = {}
): React.FC<P & { children?: React.ReactNode }> {
  const Wrapped: React.FC<P & { children?: React.ReactNode }> = (props) => {
    // Track initial page load
    useEffect(() => {
      if (options.trackNavigation !== false) {
        let url = window.location.pathname;
        if (options.trackQuery) {
          url += window.location.search;
        }
        if (options.trackHash) {
          url += window.location.hash;
        }

        ErrorExplorer.addBreadcrumb({
          type: 'navigation',
          category: 'navigation',
          message: `Initial page: ${url}`,
          level: 'info',
          data: {
            to: url,
          },
        });
      }
    }, []);

    return <RouterComponent {...props} />;
  };

  Wrapped.displayName = `withRouterTracking(${RouterComponent.displayName || RouterComponent.name || 'Router'})`;

  return Wrapped;
}
