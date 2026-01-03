/**
 * Vue 3 Composables for Error Explorer
 */

import { inject, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { ErrorExplorer } from '@error-explorer/browser';
import type { Breadcrumb, CaptureContext, UserContext } from '@error-explorer/browser';

/**
 * Injection key for Error Explorer
 */
export const ErrorExplorerKey = Symbol('errorExplorer');

/**
 * Use Error Explorer instance
 *
 * @example
 * ```ts
 * const { captureException, addBreadcrumb } = useErrorExplorer();
 *
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureException(error);
 * }
 * ```
 */
export function useErrorExplorer() {
  // Try to get from injection (if using plugin)
  const injected = inject<typeof ErrorExplorer | null>(ErrorExplorerKey, null) ||
                   inject<typeof ErrorExplorer | null>('errorExplorer', null);

  // Fall back to singleton
  const errorExplorer = injected || ErrorExplorer;

  return {
    /**
     * Check if Error Explorer is initialized
     */
    isInitialized: () => errorExplorer.isInitialized(),

    /**
     * Capture an exception
     */
    captureException: (error: Error, context?: CaptureContext) =>
      errorExplorer.captureException(error, context),

    /**
     * Capture a message
     */
    captureMessage: (message: string, level?: 'debug' | 'info' | 'warning' | 'error' | 'critical') =>
      errorExplorer.captureMessage(message, level),

    /**
     * Add a breadcrumb
     */
    addBreadcrumb: (breadcrumb: Breadcrumb) =>
      errorExplorer.addBreadcrumb(breadcrumb),

    /**
     * Set user context
     */
    setUser: (user: UserContext) => errorExplorer.setUser(user),

    /**
     * Clear user context
     */
    clearUser: () => errorExplorer.clearUser(),

    /**
     * Set a tag
     */
    setTag: (key: string, value: string) => errorExplorer.setTag(key, value),

    /**
     * Set multiple tags
     */
    setTags: (tags: Record<string, string>) => errorExplorer.setTags(tags),

    /**
     * Set extra context
     */
    setExtra: (extra: Record<string, unknown>) => errorExplorer.setExtra(extra),

    /**
     * Set named context
     */
    setContext: (name: string, context: Record<string, unknown>) =>
      errorExplorer.setContext(name, context),

    /**
     * Flush pending events
     */
    flush: (timeout?: number) => errorExplorer.flush(timeout),

    /**
     * Close the SDK
     */
    close: (timeout?: number) => errorExplorer.close(timeout),
  };
}

/**
 * Track component lifecycle for debugging
 *
 * @example
 * ```ts
 * // In setup()
 * useComponentBreadcrumbs();
 * ```
 */
export function useComponentBreadcrumbs() {
  const instance = getCurrentInstance();
  const componentName = instance?.type
    ? (instance.type as { name?: string; __name?: string }).name ||
      (instance.type as { __name?: string }).__name ||
      'Unknown'
    : 'Unknown';

  onMounted(() => {
    ErrorExplorer.addBreadcrumb({
      type: 'debug',
      category: 'vue.lifecycle',
      message: `${componentName} mounted`,
      level: 'debug',
    });
  });

  onUnmounted(() => {
    ErrorExplorer.addBreadcrumb({
      type: 'debug',
      category: 'vue.lifecycle',
      message: `${componentName} unmounted`,
      level: 'debug',
    });
  });
}

/**
 * Create a breadcrumb tracker for user actions
 *
 * @example
 * ```ts
 * const { trackAction } = useActionTracker();
 *
 * const handleClick = () => {
 *   trackAction('button_clicked', { buttonId: 'submit' });
 *   // ... actual handler
 * };
 * ```
 */
export function useActionTracker() {
  const instance = getCurrentInstance();
  const componentName = instance?.type
    ? (instance.type as { name?: string; __name?: string }).name ||
      (instance.type as { __name?: string }).__name ||
      'Unknown'
    : 'Unknown';

  return {
    /**
     * Track a user action
     */
    trackAction: (action: string, data?: Record<string, unknown>) => {
      ErrorExplorer.addBreadcrumb({
        type: 'user-action',
        category: 'action',
        message: action,
        level: 'info',
        data: {
          component: componentName,
          ...data,
        },
      });
    },

    /**
     * Track a UI interaction
     */
    trackInteraction: (element: string, action: 'click' | 'input' | 'focus' | 'blur' | 'submit', data?: Record<string, unknown>) => {
      ErrorExplorer.addBreadcrumb({
        type: 'user-action',
        category: `ui.${action}`,
        message: `${action} on ${element}`,
        level: 'info',
        data: {
          component: componentName,
          element,
          ...data,
        },
      });
    },
  };
}

/**
 * Create an error handler for async operations
 *
 * @example
 * ```ts
 * const { wrapAsync, handleError } = useErrorHandler();
 *
 * // Option 1: Wrap async function
 * const safeSubmit = wrapAsync(async () => {
 *   await api.submit(data);
 * });
 *
 * // Option 2: Manual handling
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   handleError(error, { tags: { operation: 'risky' } });
 * }
 * ```
 */
export function useErrorHandler(defaultContext?: CaptureContext) {
  const instance = getCurrentInstance();
  const componentName = instance?.type
    ? (instance.type as { name?: string; __name?: string }).name ||
      (instance.type as { __name?: string }).__name ||
      'Unknown'
    : 'Unknown';

  /**
   * Handle an error with context
   */
  const handleError = (error: unknown, context?: CaptureContext) => {
    const err = error instanceof Error ? error : new Error(String(error));

    ErrorExplorer.captureException(err, {
      ...defaultContext,
      ...context,
      tags: {
        'vue.component': componentName,
        ...defaultContext?.tags,
        ...context?.tags,
      },
    });

    return err;
  };

  /**
   * Wrap an async function with error handling
   */
  const wrapAsync = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: CaptureContext
  ): ((...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined>) => {
    return async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, context);
        return undefined;
      }
    };
  };

  /**
   * Create a try-catch wrapper that captures errors
   */
  const tryCatch = <T>(fn: () => T, context?: CaptureContext): T | undefined => {
    try {
      return fn();
    } catch (error) {
      handleError(error, context);
      return undefined;
    }
  };

  return {
    handleError,
    wrapAsync,
    tryCatch,
  };
}

/**
 * Set user context from a reactive source
 *
 * @example
 * ```ts
 * const user = ref({ id: '123', email: 'user@example.com' });
 * useUserContext(user);
 * ```
 */
export function useUserContext(user: { value: UserContext | null } | UserContext | null) {
  const setUserFromValue = (value: UserContext | null) => {
    if (value) {
      ErrorExplorer.setUser(value);
    } else {
      ErrorExplorer.clearUser();
    }
  };

  // Handle both refs and plain objects
  if (user && typeof user === 'object' && 'value' in user) {
    // It's a ref - cast to the expected type
    const refValue = (user as { value: UserContext | null }).value;
    setUserFromValue(refValue);

    // Note: We don't set up a watcher here because that would require
    // importing watch from vue, which adds complexity.
    // Users should manually call setUser when the user changes.
  } else {
    setUserFromValue(user as UserContext | null);
  }

  return {
    setUser: (newUser: UserContext) => ErrorExplorer.setUser(newUser),
    clearUser: () => ErrorExplorer.clearUser(),
  };
}
