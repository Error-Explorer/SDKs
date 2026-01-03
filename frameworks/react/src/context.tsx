/**
 * React Context Provider for Error Explorer
 */

import React, { createContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { ErrorExplorer } from '@error-explorer/browser';
import type { Breadcrumb, CaptureContext, UserContext } from '@error-explorer/browser';
import type { ReactErrorExplorerOptions, ErrorExplorerContextValue } from './types';

/**
 * React Context for Error Explorer
 */
export const ErrorExplorerContext = createContext<ErrorExplorerContextValue | null>(null);

/**
 * Error Explorer Provider Component
 *
 * Initializes the Error Explorer SDK and provides context to child components.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ErrorExplorerProvider
 *       options={{
 *         token: 'ee_your_token',
 *         project: 'my-react-app',
 *         environment: 'production',
 *       }}
 *     >
 *       <MainContent />
 *     </ErrorExplorerProvider>
 *   );
 * }
 * ```
 */
export function ErrorExplorerProvider({
  options,
  children,
}: {
  options: ReactErrorExplorerOptions;
  children: ReactNode;
}) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize on mount
  useEffect(() => {
    if (!ErrorExplorer.isInitialized()) {
      ErrorExplorer.init(options);
      setIsInitialized(true);
    } else {
      setIsInitialized(true);
    }

    // Cleanup on unmount
    return () => {
      // Don't close on unmount as other components might still need it
      // ErrorExplorer.close();
    };
  }, []); // Only run once on mount

  // Create stable context value
  const contextValue = useMemo<ErrorExplorerContextValue>(
    () => ({
      isInitialized,
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
    }),
    [isInitialized]
  );

  return (
    <ErrorExplorerContext.Provider value={contextValue}>
      {children}
    </ErrorExplorerContext.Provider>
  );
}

/**
 * Initialize Error Explorer directly (without provider)
 *
 * Use this if you don't need the React Context and just want to initialize
 * the SDK globally.
 *
 * @example
 * ```tsx
 * // In your entry file (main.tsx)
 * import { initErrorExplorer } from '@error-explorer/react';
 *
 * initErrorExplorer({
 *   token: 'ee_your_token',
 *   project: 'my-react-app',
 *   environment: 'production',
 * });
 *
 * ReactDOM.createRoot(root).render(<App />);
 * ```
 */
export function initErrorExplorer(options: ReactErrorExplorerOptions): void {
  if (!ErrorExplorer.isInitialized()) {
    ErrorExplorer.init(options);
  }
}
