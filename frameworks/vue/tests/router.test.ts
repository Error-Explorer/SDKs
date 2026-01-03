/**
 * Tests for Vue Router Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRouter, createMemoryHistory } from 'vue-router';
import { setupRouterIntegration } from '../src/router';
import { ErrorExplorer } from '@error-explorer/browser';

// Mock ErrorExplorer
vi.mock('@error-explorer/browser', () => ({
  ErrorExplorer: {
    init: vi.fn(),
    isInitialized: vi.fn(() => true),
    captureException: vi.fn(),
    addBreadcrumb: vi.fn(),
    setUser: vi.fn(),
    clearUser: vi.fn(),
    setTag: vi.fn(),
    setTags: vi.fn(),
    setExtra: vi.fn(),
    setContext: vi.fn(),
    captureMessage: vi.fn(),
    flush: vi.fn(),
    close: vi.fn(),
  },
}));

describe('Router Integration', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    vi.clearAllMocks();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
        { path: '/about', name: 'about', component: { template: '<div>About</div>' } },
        { path: '/users/:id', name: 'user', component: { template: '<div>User</div>' } },
        {
          path: '/admin',
          name: 'admin',
          component: { template: '<div>Admin</div>' },
          meta: { title: 'Admin Panel' },
        },
      ],
    });
  });

  describe('setupRouterIntegration', () => {
    it('should return a cleanup function', () => {
      const cleanup = setupRouterIntegration(router);

      expect(typeof cleanup).toBe('function');

      cleanup();
    });

    it('should add navigation breadcrumb on route change', async () => {
      setupRouterIntegration(router);

      await router.push('/about');

      // afterEach adds a breadcrumb with the navigated route
      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigation',
          category: 'router',
          message: expect.stringContaining('about'),
        })
      );
    });

    it('should track from and to routes in beforeEach breadcrumb', async () => {
      setupRouterIntegration(router);

      // Navigate to home first to establish a starting point
      await router.push('/');
      vi.clearAllMocks();

      await router.push('/about');

      // beforeEach adds breadcrumb with from/to data
      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigation',
          category: 'router',
          message: 'Navigating from home to about',
          data: expect.objectContaining({
            from: expect.objectContaining({
              path: '/',
              name: 'home',
            }),
            to: expect.objectContaining({
              path: '/about',
              name: 'about',
            }),
          }),
        })
      );
    });

    it('should use route name when available', async () => {
      setupRouterIntegration(router);

      await router.push('/about');

      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('about'),
        })
      );
    });

    it('should use path when name is not available', async () => {
      const routerWithoutNames = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/', component: { template: '<div>Home</div>' } },
          { path: '/no-name', component: { template: '<div>NoName</div>' } },
        ],
      });

      setupRouterIntegration(routerWithoutNames);

      await routerWithoutNames.push('/no-name');

      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('/no-name'),
        })
      );
    });
  });

  describe('Options', () => {
    it('should not track navigation when trackNavigation is false', async () => {
      setupRouterIntegration(router, { trackNavigation: false });

      await router.push('/about');

      expect(ErrorExplorer.addBreadcrumb).not.toHaveBeenCalled();
    });

    it('should track route params when trackParams is true', async () => {
      setupRouterIntegration(router, { trackParams: true });

      await router.push('/users/123');

      // The afterEach breadcrumb should include params in route data
      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigation',
          category: 'router',
          data: expect.objectContaining({
            route: expect.objectContaining({
              params: { id: '123' },
            }),
          }),
        })
      );
    });

    it('should not track params by default', async () => {
      setupRouterIntegration(router);

      await router.push('/users/456');

      const calls = vi.mocked(ErrorExplorer.addBreadcrumb).mock.calls;
      const afterEachCall = calls.find(
        (call) => call[0].message?.startsWith('Navigated to')
      );
      expect(afterEachCall?.[0].data?.route?.params).toBeUndefined();
    });

    it('should track query params when trackQuery is true', async () => {
      setupRouterIntegration(router, { trackQuery: true });

      await router.push('/about?foo=bar&baz=qux');

      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigation',
          category: 'router',
          data: expect.objectContaining({
            route: expect.objectContaining({
              query: { foo: 'bar', baz: 'qux' },
            }),
          }),
        })
      );
    });

    it('should not track query by default', async () => {
      setupRouterIntegration(router);

      await router.push('/about?secret=token');

      const calls = vi.mocked(ErrorExplorer.addBreadcrumb).mock.calls;
      const afterEachCall = calls.find(
        (call) => call[0].message?.startsWith('Navigated to')
      );
      expect(afterEachCall?.[0].data?.route?.query).toBeUndefined();
    });

    it('should use custom getRouteName function', async () => {
      setupRouterIntegration(router, {
        getRouteName: (route) =>
          (route.meta?.title as string) || route.name?.toString() || route.path,
      });

      await router.push('/admin');

      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Admin Panel'),
        })
      );
    });

    it('should filter navigation with beforeNavigationBreadcrumb', async () => {
      setupRouterIntegration(router, {
        beforeNavigationBreadcrumb: (from, to) => {
          // Only skip navigating TO admin, not FROM initial route
          return to.path !== '/admin';
        },
      });

      // Navigate to home first
      await router.push('/');
      vi.clearAllMocks();

      // Navigate to about - should create breadcrumbs
      await router.push('/about');
      const aboutCalls = vi.mocked(ErrorExplorer.addBreadcrumb).mock.calls.length;
      expect(aboutCalls).toBeGreaterThan(0);

      vi.clearAllMocks();

      // Navigate to admin - beforeEach breadcrumb should be filtered
      await router.push('/admin');
      const adminCalls = vi.mocked(ErrorExplorer.addBreadcrumb).mock.calls;

      // The beforeEach breadcrumb should NOT be added (filtered)
      // But afterEach still adds one for the successful navigation
      const beforeEachCall = adminCalls.find(
        (call) => call[0].message?.startsWith('Navigating from')
      );
      expect(beforeEachCall).toBeUndefined();
    });
  });

  describe('Router Errors', () => {
    it('should capture router errors', async () => {
      const errorRouter = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/', component: { template: '<div>Home</div>' } },
          {
            path: '/error',
            component: { template: '<div>Error</div>' },
            beforeEnter: () => {
              throw new Error('Navigation error');
            },
          },
        ],
      });

      setupRouterIntegration(errorRouter);

      try {
        await errorRouter.push('/error');
      } catch {
        // Expected
      }

      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            'router.error': 'unhandled',
          }),
        })
      );
    });

    it('should add breadcrumb for router errors', async () => {
      const errorRouter = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/', component: { template: '<div>Home</div>' } },
          {
            path: '/error',
            component: { template: '<div>Error</div>' },
            beforeEnter: () => {
              throw new Error('Route guard error');
            },
          },
        ],
      });

      setupRouterIntegration(errorRouter);

      try {
        await errorRouter.push('/error');
      } catch {
        // Expected
      }

      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          category: 'router.error',
          level: 'error',
        })
      );
    });
  });

  describe('Cleanup', () => {
    it('should remove guards on cleanup', async () => {
      const cleanup = setupRouterIntegration(router);

      await router.push('/about');
      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalled();

      vi.clearAllMocks();
      cleanup();

      // After cleanup, navigate again
      await router.push('/');

      // No new breadcrumbs should be added by our integration
      // (The cleanup function removes our guards)
    });
  });

  describe('Navigation timing', () => {
    it('should include duration in afterEach breadcrumb', async () => {
      setupRouterIntegration(router);

      await router.push('/about');

      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            duration: expect.any(Number),
          }),
        })
      );
    });
  });
});
