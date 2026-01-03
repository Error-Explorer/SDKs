/**
 * Tests for React hooks
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  useErrorExplorer,
  useErrorHandler,
  useUserContext,
  useActionTracker,
  useComponentBreadcrumbs,
} from '../src/hooks';
import { ErrorExplorerProvider } from '../src/context';

// Mock ErrorExplorer
vi.mock('@error-explorer/browser', () => ({
  ErrorExplorer: {
    isInitialized: vi.fn(() => true),
    init: vi.fn(),
    captureException: vi.fn(() => 'event-123'),
    captureMessage: vi.fn(() => 'event-456'),
    addBreadcrumb: vi.fn(),
    setUser: vi.fn(),
    clearUser: vi.fn(),
    setTag: vi.fn(),
    setTags: vi.fn(),
    setExtra: vi.fn(),
    setContext: vi.fn(),
    flush: vi.fn(() => Promise.resolve(true)),
    close: vi.fn(() => Promise.resolve(true)),
  },
}));

import { ErrorExplorer } from '@error-explorer/browser';

beforeEach(() => {
  vi.clearAllMocks();
  (ErrorExplorer.isInitialized as ReturnType<typeof vi.fn>).mockReturnValue(true);
});

// Wrapper for hooks that need context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ErrorExplorerProvider options={{ token: 'test', project: 'test' }}>
    {children}
  </ErrorExplorerProvider>
);

describe('useErrorExplorer', () => {
  it('should return SDK methods without provider (using singleton)', () => {
    const { result } = renderHook(() => useErrorExplorer());

    expect(result.current.isInitialized).toBe(true);
    expect(result.current.captureException).toBeDefined();
    expect(result.current.captureMessage).toBeDefined();
    expect(result.current.addBreadcrumb).toBeDefined();
    expect(result.current.setUser).toBeDefined();
    expect(result.current.clearUser).toBeDefined();
    expect(result.current.setTag).toBeDefined();
    expect(result.current.setTags).toBeDefined();
    expect(result.current.setExtra).toBeDefined();
    expect(result.current.setContext).toBeDefined();
    expect(result.current.flush).toBeDefined();
    expect(result.current.close).toBeDefined();
  });

  it('should return context methods when used with provider', () => {
    const { result } = renderHook(() => useErrorExplorer(), { wrapper });

    expect(result.current.captureException).toBeDefined();
  });

  it('should capture exception correctly', () => {
    const { result } = renderHook(() => useErrorExplorer());

    const error = new Error('Test error');
    result.current.captureException(error, { tags: { test: 'true' } });

    expect(ErrorExplorer.captureException).toHaveBeenCalledWith(error, { tags: { test: 'true' } });
  });

  it('should capture message correctly', () => {
    const { result } = renderHook(() => useErrorExplorer());

    result.current.captureMessage('Test message', 'warning');

    expect(ErrorExplorer.captureMessage).toHaveBeenCalledWith('Test message', 'warning');
  });

  it('should add breadcrumb correctly', () => {
    const { result } = renderHook(() => useErrorExplorer());

    result.current.addBreadcrumb({
      type: 'test',
      category: 'test',
      message: 'Test breadcrumb',
      level: 'info',
    });

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'test',
      category: 'test',
      message: 'Test breadcrumb',
      level: 'info',
    });
  });

  it('should return isInitialized as false when not initialized', () => {
    (ErrorExplorer.isInitialized as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { result } = renderHook(() => useErrorExplorer());

    expect(result.current.isInitialized).toBe(false);
  });
});

describe('useErrorHandler', () => {
  it('should return handler functions', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.handleError).toBeDefined();
    expect(result.current.wrapAsync).toBeDefined();
    expect(result.current.tryCatch).toBeDefined();
  });

  it('should handle Error instance correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    const error = new Error('Test error');
    const returnedError = result.current.handleError(error);

    expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
      error,
      expect.any(Object)
    );
    expect(returnedError).toBe(error);
  });

  it('should convert non-Error to Error', () => {
    const { result } = renderHook(() => useErrorHandler());

    const returnedError = result.current.handleError('string error');

    expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'string error',
      }),
      expect.any(Object)
    );
    expect(returnedError).toBeInstanceOf(Error);
    expect(returnedError.message).toBe('string error');
  });

  it('should merge default context with provided context', () => {
    const { result } = renderHook(() =>
      useErrorHandler({ tags: { default: 'value' } })
    );

    result.current.handleError(new Error('Test'), { tags: { custom: 'tag' } });

    expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          default: 'value',
          custom: 'tag',
        }),
      })
    );
  });

  it('should wrap async function and catch errors', async () => {
    const { result } = renderHook(() => useErrorHandler());

    const failingFn = async () => {
      throw new Error('Async error');
    };

    const wrapped = result.current.wrapAsync(failingFn);
    const returnValue = await wrapped();

    expect(ErrorExplorer.captureException).toHaveBeenCalled();
    expect(returnValue).toBeUndefined();
  });

  it('should wrap async function and return value on success', async () => {
    const { result } = renderHook(() => useErrorHandler());

    const successFn = async () => 'success';

    const wrapped = result.current.wrapAsync(successFn);
    const returnValue = await wrapped();

    expect(ErrorExplorer.captureException).not.toHaveBeenCalled();
    expect(returnValue).toBe('success');
  });

  it('should tryCatch sync function and catch errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    const failingFn = () => {
      throw new Error('Sync error');
    };

    const returnValue = result.current.tryCatch(failingFn);

    expect(ErrorExplorer.captureException).toHaveBeenCalled();
    expect(returnValue).toBeUndefined();
  });

  it('should tryCatch sync function and return value on success', () => {
    const { result } = renderHook(() => useErrorHandler());

    const successFn = () => 'success';

    const returnValue = result.current.tryCatch(successFn);

    expect(ErrorExplorer.captureException).not.toHaveBeenCalled();
    expect(returnValue).toBe('success');
  });
});

describe('useUserContext', () => {
  it('should set user when user is provided', () => {
    const user = { id: 'user-123', email: 'test@example.com' };

    renderHook(() => useUserContext(user));

    expect(ErrorExplorer.setUser).toHaveBeenCalledWith(user);
  });

  it('should clear user when user changes from non-null to null', () => {
    const { rerender } = renderHook(
      ({ user }) => useUserContext(user),
      { initialProps: { user: { id: 'user-123' } as any } }
    );

    vi.clearAllMocks();

    // Change user to null
    rerender({ user: null });

    expect(ErrorExplorer.clearUser).toHaveBeenCalled();
  });

  it('should not call clearUser on initial render with null', () => {
    renderHook(() => useUserContext(null));

    // clearUser should not be called because there's no previous user to clear
    expect(ErrorExplorer.clearUser).not.toHaveBeenCalled();
  });

  it('should clear user on unmount', () => {
    const { unmount } = renderHook(() =>
      useUserContext({ id: 'user-123' })
    );

    vi.clearAllMocks();
    unmount();

    expect(ErrorExplorer.clearUser).toHaveBeenCalled();
  });

  it('should update user when user changes', () => {
    const { rerender } = renderHook(
      ({ user }) => useUserContext(user),
      { initialProps: { user: { id: 'user-1' } as any } }
    );

    expect(ErrorExplorer.setUser).toHaveBeenCalledWith({ id: 'user-1' });

    vi.clearAllMocks();

    rerender({ user: { id: 'user-2' } });

    expect(ErrorExplorer.setUser).toHaveBeenCalledWith({ id: 'user-2' });
  });

  it('should not update if user is the same', () => {
    const user = { id: 'user-123' };

    const { rerender } = renderHook(
      ({ user }) => useUserContext(user),
      { initialProps: { user } }
    );

    vi.clearAllMocks();

    // Rerender with same user object reference
    rerender({ user });

    expect(ErrorExplorer.setUser).not.toHaveBeenCalled();
  });
});

describe('useActionTracker', () => {
  it('should return tracking functions', () => {
    const { result } = renderHook(() => useActionTracker());

    expect(result.current.trackAction).toBeDefined();
    expect(result.current.trackInteraction).toBeDefined();
  });

  it('should track action with breadcrumb', () => {
    const { result } = renderHook(() => useActionTracker('TestComponent'));

    result.current.trackAction('button_clicked', { buttonId: 'submit' });

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'user-action',
      category: 'action',
      message: 'button_clicked',
      level: 'info',
      data: {
        component: 'TestComponent',
        buttonId: 'submit',
      },
    });
  });

  it('should track interaction with breadcrumb', () => {
    const { result } = renderHook(() => useActionTracker('Form'));

    result.current.trackInteraction('email-input', 'focus', { value: 'test' });

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'user-action',
      category: 'ui.focus',
      message: 'focus on email-input',
      level: 'info',
      data: {
        component: 'Form',
        element: 'email-input',
        value: 'test',
      },
    });
  });

  it('should track click interaction', () => {
    const { result } = renderHook(() => useActionTracker());

    result.current.trackInteraction('button', 'click');

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'ui.click',
        message: 'click on button',
      })
    );
  });

  it('should track submit interaction', () => {
    const { result } = renderHook(() => useActionTracker());

    result.current.trackInteraction('form', 'submit');

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'ui.submit',
        message: 'submit on form',
      })
    );
  });
});

describe('useComponentBreadcrumbs', () => {
  it('should add mount breadcrumb on mount', () => {
    renderHook(() => useComponentBreadcrumbs('TestComponent'));

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'debug',
      category: 'react.lifecycle',
      message: 'TestComponent mounted',
      level: 'debug',
    });
  });

  it('should add unmount breadcrumb on unmount', () => {
    const { unmount } = renderHook(() => useComponentBreadcrumbs('TestComponent'));

    vi.clearAllMocks();
    unmount();

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'debug',
      category: 'react.lifecycle',
      message: 'TestComponent unmounted',
      level: 'debug',
    });
  });
});
