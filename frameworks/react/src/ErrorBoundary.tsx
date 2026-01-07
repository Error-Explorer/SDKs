/**
 * ErrorBoundary component for React
 * Catches errors in child components and reports them to Error Explorer
 */

import React, { Component, type ReactNode, type ComponentType } from 'react';
import { ErrorExplorer } from '@error-explorer/browser';
import type {
  ErrorBoundaryProps,
  ErrorBoundaryState,
  FallbackProps,
  WithErrorBoundaryOptions,
} from './types';

/**
 * Default fallback component
 */
const DefaultFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => (
  <div
    role="alert"
    style={{
      padding: '20px',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
    }}
  >
    <h2 style={{ margin: '0 0 10px 0' }}>Something went wrong</h2>
    <pre style={{
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      backgroundColor: 'rgba(0,0,0,0.1)',
      padding: '10px',
      borderRadius: '4px',
      fontSize: '14px',
    }}>
      {error.message}
    </pre>
    <button
      onClick={resetErrorBoundary}
      style={{
        marginTop: '10px',
        padding: '8px 16px',
        backgroundColor: '#721c24',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      Try again
    </button>
  </div>
);

/**
 * ErrorBoundary class component
 *
 * React Error Boundaries must be class components - there's no hook equivalent.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example
 * With render prop fallback:
 * ```tsx
 * <ErrorBoundary
 *   fallback={({ error, resetErrorBoundary }) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={resetErrorBoundary}>Retry</button>
 *     </div>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultProps = {
    capture: true,
    captureComponentStack: true,
    tags: {},
    context: {},
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    const {
      capture = true,
      captureComponentStack = true,
      beforeReactCapture,
      tags = {},
      context = {},
      onError,
    } = this.props;

    // Call user's error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Check if capture is enabled
    if (!capture) {
      return;
    }

    // Call beforeReactCapture hook - if it returns false, skip capturing
    if (beforeReactCapture) {
      const shouldCapture = beforeReactCapture(error, errorInfo);
      if (shouldCapture === false) {
        return;
      }
    }

    // Build extra context
    const extra: Record<string, unknown> = { ...context };

    // Only include component stack if enabled
    if (captureComponentStack && errorInfo.componentStack) {
      extra.componentStack = errorInfo.componentStack;
    }

    // Capture to Error Explorer
    ErrorExplorer.captureException(error, {
      tags: {
        'react.errorBoundary': 'true',
        ...tags,
      },
      extra,
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset if resetKeys changed
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    const { onReset } = this.props;

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (onReset) {
      onReset();
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      const fallbackProps: FallbackProps = {
        error,
        errorInfo,
        resetErrorBoundary: this.reset,
      };

      // Render function fallback
      if (typeof fallback === 'function') {
        return fallback(fallbackProps);
      }

      // Static fallback
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return <DefaultFallback {...fallbackProps} />;
    }

    return children;
  }
}

/**
 * Higher-order component to wrap a component with ErrorBoundary
 *
 * @example
 * ```tsx
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   fallback: <ErrorFallback />,
 *   onError: (error) => console.error(error),
 * });
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): ComponentType<P> {
  const {
    fallback,
    onError,
    capture = true,
    captureComponentStack = true,
    beforeReactCapture,
    tags = {},
    context = {},
  } = options;

  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary
      fallback={fallback}
      onError={onError}
      capture={capture}
      captureComponentStack={captureComponentStack}
      beforeReactCapture={beforeReactCapture}
      tags={tags}
      context={context}
    >
      <Component {...props} />
    </ErrorBoundary>
  );

  // Preserve display name for debugging
  const displayName = Component.displayName || Component.name || 'Component';
  Wrapped.displayName = `withErrorBoundary(${displayName})`;

  return Wrapped;
}

/**
 * useErrorBoundary hook for functional components
 *
 * Note: This doesn't create an error boundary - those must be class components.
 * Instead, this provides a way to show/trigger the nearest error boundary.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { showBoundary } = useErrorBoundary();
 *
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation();
 *     } catch (error) {
 *       showBoundary(error);
 *     }
 *   };
 * }
 * ```
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  // If there's an error, throw it to be caught by the nearest error boundary
  if (error) {
    throw error;
  }

  return {
    /**
     * Trigger the nearest error boundary with the given error
     */
    showBoundary: (err: Error) => setError(err),

    /**
     * Reset the error state
     */
    resetBoundary: () => setError(null),
  };
}
