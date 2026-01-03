/**
 * Types for @error-explorer/react
 */

import type { ReactNode, ComponentType } from 'react';
import type { InitOptions, UserContext, Breadcrumb, CaptureContext } from '@error-explorer/browser';

/**
 * React-specific initialization options
 */
export interface ReactErrorExplorerOptions extends InitOptions {
  /**
   * Whether to capture React component stack traces
   * @default true
   */
  captureComponentStack?: boolean;

  /**
   * Hook called before capturing a React error
   * Return false to skip capturing
   */
  beforeReactCapture?: (
    error: Error,
    errorInfo: React.ErrorInfo
  ) => boolean;
}

/**
 * React component context captured with errors
 */
export interface ReactComponentContext {
  /**
   * Component name
   */
  name?: string;

  /**
   * React component stack
   */
  componentStack?: string;

  /**
   * Additional component info
   */
  info?: string;
}

/**
 * ErrorBoundary component props
 */
export interface ErrorBoundaryProps {
  /**
   * Child components to wrap
   */
  children: ReactNode;

  /**
   * Fallback UI to render when an error occurs
   */
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);

  /**
   * Callback when an error is caught
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;

  /**
   * Callback when the error is reset
   */
  onReset?: () => void;

  /**
   * Whether to capture the error to Error Explorer
   * @default true
   */
  capture?: boolean;

  /**
   * Additional tags to add when capturing
   */
  tags?: Record<string, string>;

  /**
   * Additional context to add when capturing
   */
  context?: Record<string, unknown>;

  /**
   * Reset keys - when these change, the error boundary resets
   */
  resetKeys?: unknown[];
}

/**
 * Props passed to the fallback component
 */
export interface FallbackProps {
  /**
   * The error that was caught
   */
  error: Error;

  /**
   * Error info including component stack
   */
  errorInfo: React.ErrorInfo | null;

  /**
   * Function to reset the error boundary
   */
  resetErrorBoundary: () => void;
}

/**
 * ErrorBoundary state
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Provider props for ErrorExplorerProvider
 */
export interface ErrorExplorerProviderProps {
  /**
   * SDK initialization options
   */
  options: ReactErrorExplorerOptions;

  /**
   * Child components
   */
  children: ReactNode;
}

/**
 * Context value exposed by ErrorExplorerProvider
 */
export interface ErrorExplorerContextValue {
  /**
   * Check if SDK is initialized
   */
  isInitialized: boolean;

  /**
   * Capture an exception
   */
  captureException: (error: Error, context?: CaptureContext) => string;

  /**
   * Capture a message
   */
  captureMessage: (message: string, level?: 'debug' | 'info' | 'warning' | 'error' | 'critical') => string;

  /**
   * Add a breadcrumb
   */
  addBreadcrumb: (breadcrumb: Breadcrumb) => void;

  /**
   * Set user context
   */
  setUser: (user: UserContext) => void;

  /**
   * Clear user context
   */
  clearUser: () => void;

  /**
   * Set a tag
   */
  setTag: (key: string, value: string) => void;

  /**
   * Set multiple tags
   */
  setTags: (tags: Record<string, string>) => void;

  /**
   * Set extra context
   */
  setExtra: (extra: Record<string, unknown>) => void;

  /**
   * Set named context
   */
  setContext: (name: string, context: Record<string, unknown>) => void;

  /**
   * Flush pending events
   */
  flush: (timeout?: number) => Promise<boolean>;

  /**
   * Close the SDK
   */
  close: (timeout?: number) => Promise<boolean>;
}

/**
 * HOC options for withErrorBoundary
 */
export interface WithErrorBoundaryOptions {
  /**
   * Fallback UI to render when an error occurs
   */
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);

  /**
   * Callback when an error is caught
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;

  /**
   * Whether to capture the error to Error Explorer
   * @default true
   */
  capture?: boolean;

  /**
   * Additional tags to add when capturing
   */
  tags?: Record<string, string>;

  /**
   * Additional context to add when capturing
   */
  context?: Record<string, unknown>;
}

// Re-export browser types
export type { InitOptions, UserContext, Breadcrumb, CaptureContext };
