/**
 * React Hooks for Error Explorer
 */

import { useContext, useEffect, useCallback, useRef } from 'react';
import { ErrorExplorer } from '@error-explorer/browser';
import type { Breadcrumb, CaptureContext, UserContext } from '@error-explorer/browser';
import { ErrorExplorerContext } from './context';

/**
 * Use Error Explorer instance
 *
 * Returns the Error Explorer SDK methods for capturing errors and managing context.
 *
 * @example
 * ```tsx
 * const { captureException, addBreadcrumb, setUser } = useErrorExplorer();
 *
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureException(error);
 * }
 * ```
 */
export function useErrorExplorer() {
  // Try to get from context first (if using provider)
  const contextValue = useContext(ErrorExplorerContext);

  // If context is available and initialized, use it
  if (contextValue?.isInitialized) {
    return contextValue;
  }

  // Fall back to singleton
  return {
    isInitialized: ErrorExplorer.isInitialized(),
    captureException: (error: Error, context?: CaptureContext) =>
      ErrorExplorer.captureException(error, context),
    captureMessage: (message: string, level?: 'debug' | 'info' | 'warning' | 'error' | 'critical') =>
      ErrorExplorer.captureMessage(message, level),
    addBreadcrumb: (breadcrumb: Breadcrumb) => ErrorExplorer.addBreadcrumb(breadcrumb),
    setUser: (user: UserContext) => ErrorExplorer.setUser(user),
    clearUser: () => ErrorExplorer.clearUser(),
    setTag: (key: string, value: string) => ErrorExplorer.setTag(key, value),
    setTags: (tags: Record<string, string>) => ErrorExplorer.setTags(tags),
    setExtra: (extra: Record<string, unknown>) => ErrorExplorer.setExtra(extra),
    setContext: (name: string, context: Record<string, unknown>) =>
      ErrorExplorer.setContext(name, context),
    flush: (timeout?: number) => ErrorExplorer.flush(timeout),
    close: (timeout?: number) => ErrorExplorer.close(timeout),
  };
}

/**
 * Error handler hook for async operations
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { handleError, wrapAsync } = useErrorHandler();
 *
 *   // Option 1: Wrap async function
 *   const safeSubmit = wrapAsync(async () => {
 *     await api.submit(data);
 *   });
 *
 *   // Option 2: Manual handling
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation();
 *     } catch (error) {
 *       handleError(error, { tags: { operation: 'risky' } });
 *     }
 *   };
 * }
 * ```
 */
export function useErrorHandler(defaultContext?: CaptureContext) {
  const { captureException } = useErrorExplorer();

  /**
   * Handle an error with optional context
   */
  const handleError = useCallback(
    (error: unknown, context?: CaptureContext): Error => {
      const err = error instanceof Error ? error : new Error(String(error));

      captureException(err, {
        ...defaultContext,
        ...context,
        tags: {
          ...defaultContext?.tags,
          ...context?.tags,
        },
        extra: {
          ...defaultContext?.extra,
          ...context?.extra,
        },
      });

      return err;
    },
    [captureException, defaultContext]
  );

  /**
   * Wrap an async function with error handling
   */
  const wrapAsync = useCallback(
    <T extends (...args: any[]) => Promise<any>>(
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
    },
    [handleError]
  );

  /**
   * Create a try-catch wrapper that captures errors
   */
  const tryCatch = useCallback(
    <T>(fn: () => T, context?: CaptureContext): T | undefined => {
      try {
        return fn();
      } catch (error) {
        handleError(error, context);
        return undefined;
      }
    },
    [handleError]
  );

  return {
    handleError,
    wrapAsync,
    tryCatch,
  };
}

/**
 * User context hook
 *
 * Sets the user context and cleans up on unmount.
 *
 * @example
 * ```tsx
 * function App() {
 *   const user = useCurrentUser();
 *
 *   useUserContext(user ? {
 *     id: user.id,
 *     email: user.email,
 *     name: user.name,
 *   } : null);
 *
 *   return <MainContent />;
 * }
 * ```
 */
export function useUserContext(user: UserContext | null) {
  const { setUser, clearUser } = useErrorExplorer();
  const previousUser = useRef<UserContext | null>(null);

  useEffect(() => {
    // Only update if user changed
    if (JSON.stringify(user) !== JSON.stringify(previousUser.current)) {
      if (user) {
        setUser(user);
      } else {
        clearUser();
      }
      previousUser.current = user;
    }
  }, [user, setUser, clearUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearUser();
    };
  }, [clearUser]);

  return { setUser, clearUser };
}

/**
 * Action tracker hook for user interactions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { trackAction, trackInteraction } = useActionTracker();
 *
 *   const handleSubmit = () => {
 *     trackAction('form_submitted', { formId: 'contact' });
 *     // ... actual submit logic
 *   };
 *
 *   return (
 *     <button
 *       onClick={() => {
 *         trackInteraction('submit-button', 'click');
 *         handleSubmit();
 *       }}
 *     >
 *       Submit
 *     </button>
 *   );
 * }
 * ```
 */
export function useActionTracker(componentName?: string) {
  const { addBreadcrumb } = useErrorExplorer();

  /**
   * Track a user action
   */
  const trackAction = useCallback(
    (action: string, data?: Record<string, unknown>) => {
      addBreadcrumb({
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
    [addBreadcrumb, componentName]
  );

  /**
   * Track a UI interaction
   */
  const trackInteraction = useCallback(
    (
      element: string,
      action: 'click' | 'input' | 'focus' | 'blur' | 'submit',
      data?: Record<string, unknown>
    ) => {
      addBreadcrumb({
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
    [addBreadcrumb, componentName]
  );

  return {
    trackAction,
    trackInteraction,
  };
}

/**
 * Component lifecycle tracking hook
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useComponentBreadcrumbs('MyComponent');
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useComponentBreadcrumbs(componentName: string) {
  const { addBreadcrumb } = useErrorExplorer();

  useEffect(() => {
    addBreadcrumb({
      type: 'debug',
      category: 'react.lifecycle',
      message: `${componentName} mounted`,
      level: 'debug',
    });

    return () => {
      addBreadcrumb({
        type: 'debug',
        category: 'react.lifecycle',
        message: `${componentName} unmounted`,
        level: 'debug',
      });
    };
  }, [componentName, addBreadcrumb]);
}
