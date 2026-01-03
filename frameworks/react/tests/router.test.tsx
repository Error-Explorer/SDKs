/**
 * Tests for React Router integration
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import {
  useRouterBreadcrumbs,
  createNavigationListener,
  withRouterTracking,
} from '../src/router';

// Mock ErrorExplorer
vi.mock('@error-explorer/browser', () => ({
  ErrorExplorer: {
    isInitialized: vi.fn(() => true),
    addBreadcrumb: vi.fn(),
  },
}));

import { ErrorExplorer } from '@error-explorer/browser';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useRouterBreadcrumbs', () => {
  it('should add breadcrumb for initial navigation', () => {
    renderHook(() =>
      useRouterBreadcrumbs({ pathname: '/home' })
    );

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'navigation',
      category: 'navigation',
      message: 'Initial page: /home',
      level: 'info',
      data: {
        from: undefined,
        to: '/home',
      },
    });
  });

  it('should add breadcrumb for navigation change', () => {
    const { rerender } = renderHook(
      ({ location }) => useRouterBreadcrumbs(location),
      { initialProps: { location: { pathname: '/home' } } }
    );

    vi.clearAllMocks();

    rerender({ location: { pathname: '/about' } });

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'navigation',
      category: 'navigation',
      message: 'Navigated to /about',
      level: 'info',
      data: {
        from: '/home',
        to: '/about',
      },
    });
  });

  it('should not add breadcrumb for same path', () => {
    const { rerender } = renderHook(
      ({ location }) => useRouterBreadcrumbs(location),
      { initialProps: { location: { pathname: '/home' } } }
    );

    vi.clearAllMocks();

    rerender({ location: { pathname: '/home' } });

    expect(ErrorExplorer.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('should not track when trackNavigation is false', () => {
    renderHook(() =>
      useRouterBreadcrumbs(
        { pathname: '/home' },
        { trackNavigation: false }
      )
    );

    expect(ErrorExplorer.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('should include query string when trackQuery is true', () => {
    renderHook(() =>
      useRouterBreadcrumbs(
        { pathname: '/search', search: '?q=test' },
        { trackQuery: true }
      )
    );

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: '/search?q=test',
        }),
      })
    );
  });

  it('should not include query string when trackQuery is false', () => {
    renderHook(() =>
      useRouterBreadcrumbs(
        { pathname: '/search', search: '?q=test' },
        { trackQuery: false }
      )
    );

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: '/search',
        }),
      })
    );
  });

  it('should include hash when trackHash is true', () => {
    renderHook(() =>
      useRouterBreadcrumbs(
        { pathname: '/docs', hash: '#section-1' },
        { trackHash: true }
      )
    );

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: '/docs#section-1',
        }),
      })
    );
  });

  it('should not include hash when trackHash is false', () => {
    renderHook(() =>
      useRouterBreadcrumbs(
        { pathname: '/docs', hash: '#section-1' },
        { trackHash: false }
      )
    );

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: '/docs',
        }),
      })
    );
  });

  it('should include both query and hash when enabled', () => {
    renderHook(() =>
      useRouterBreadcrumbs(
        { pathname: '/page', search: '?tab=1', hash: '#top' },
        { trackQuery: true, trackHash: true }
      )
    );

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: '/page?tab=1#top',
        }),
      })
    );
  });
});

describe('createNavigationListener', () => {
  it('should subscribe to router and return unsubscribe function', () => {
    const unsubscribeFn = vi.fn();
    const subscribeFn = vi.fn(() => unsubscribeFn);

    const mockRouter = {
      subscribe: subscribeFn,
    };

    const unsubscribe = createNavigationListener(mockRouter);

    expect(subscribeFn).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
  });

  it('should add breadcrumb when navigation occurs', () => {
    let callback: any;
    const mockRouter = {
      subscribe: vi.fn((cb) => {
        callback = cb;
        return () => {};
      }),
    };

    createNavigationListener(mockRouter);

    // Simulate navigation
    callback({
      location: {
        pathname: '/new-page',
        search: '',
        hash: '',
      },
    });

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'navigation',
      category: 'navigation',
      message: 'Initial page: /new-page',
      level: 'info',
      data: {
        from: undefined,
        to: '/new-page',
      },
    });
  });

  it('should track from/to on subsequent navigations', () => {
    let callback: any;
    const mockRouter = {
      subscribe: vi.fn((cb) => {
        callback = cb;
        return () => {};
      }),
    };

    createNavigationListener(mockRouter);

    // First navigation
    callback({
      location: { pathname: '/page-1', search: '', hash: '' },
    });

    vi.clearAllMocks();

    // Second navigation
    callback({
      location: { pathname: '/page-2', search: '', hash: '' },
    });

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'navigation',
      category: 'navigation',
      message: 'Navigated to /page-2',
      level: 'info',
      data: {
        from: '/page-1',
        to: '/page-2',
      },
    });
  });

  it('should not track when trackNavigation is false', () => {
    let callback: any;
    const mockRouter = {
      subscribe: vi.fn((cb) => {
        callback = cb;
        return () => {};
      }),
    };

    createNavigationListener(mockRouter, { trackNavigation: false });

    callback({
      location: { pathname: '/page', search: '', hash: '' },
    });

    expect(ErrorExplorer.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('should include query string when trackQuery is true', () => {
    let callback: any;
    const mockRouter = {
      subscribe: vi.fn((cb) => {
        callback = cb;
        return () => {};
      }),
    };

    createNavigationListener(mockRouter, { trackQuery: true });

    callback({
      location: { pathname: '/search', search: '?q=test', hash: '' },
    });

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: '/search?q=test',
        }),
      })
    );
  });

  it('should skip duplicate paths', () => {
    let callback: any;
    const mockRouter = {
      subscribe: vi.fn((cb) => {
        callback = cb;
        return () => {};
      }),
    };

    createNavigationListener(mockRouter);

    callback({ location: { pathname: '/same', search: '', hash: '' } });

    vi.clearAllMocks();

    callback({ location: { pathname: '/same', search: '', hash: '' } });

    expect(ErrorExplorer.addBreadcrumb).not.toHaveBeenCalled();
  });
});

describe('withRouterTracking', () => {
  // Mock window.location for tests
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/test',
        search: '?param=value',
        hash: '#section',
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('should wrap router component and track initial page', () => {
    const MockRouter: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
      <div data-testid="router">{children}</div>
    );

    const TrackedRouter = withRouterTracking(MockRouter);

    render(
      <TrackedRouter>
        <div>Content</div>
      </TrackedRouter>
    );

    expect(screen.getByTestId('router')).toBeInTheDocument();
    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'navigation',
      category: 'navigation',
      message: 'Initial page: /test',
      level: 'info',
      data: {
        to: '/test',
      },
    });
  });

  it('should include query when trackQuery is true', () => {
    const MockRouter: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
      <div>{children}</div>
    );

    const TrackedRouter = withRouterTracking(MockRouter, { trackQuery: true });

    render(<TrackedRouter />);

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: '/test?param=value',
        }),
      })
    );
  });

  it('should include hash when trackHash is true', () => {
    const MockRouter: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
      <div>{children}</div>
    );

    const TrackedRouter = withRouterTracking(MockRouter, { trackHash: true });

    render(<TrackedRouter />);

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: '/test#section',
        }),
      })
    );
  });

  it('should not track when trackNavigation is false', () => {
    const MockRouter: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
      <div>{children}</div>
    );

    const TrackedRouter = withRouterTracking(MockRouter, { trackNavigation: false });

    render(<TrackedRouter />);

    expect(ErrorExplorer.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('should preserve display name', () => {
    const MockRouter: React.FC = () => <div />;
    MockRouter.displayName = 'BrowserRouter';

    const TrackedRouter = withRouterTracking(MockRouter);

    expect(TrackedRouter.displayName).toBe('withRouterTracking(BrowserRouter)');
  });

  it('should use component name when displayName is not set', () => {
    const SomeRouter: React.FC = () => <div />;

    const TrackedRouter = withRouterTracking(SomeRouter);

    expect(TrackedRouter.displayName).toBe('withRouterTracking(SomeRouter)');
  });
});
