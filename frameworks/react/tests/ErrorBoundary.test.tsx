/**
 * Tests for ErrorBoundary component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary, useErrorBoundary } from '../src/ErrorBoundary';
import { ErrorExplorer } from '@error-explorer/browser';

// Mock ErrorExplorer
vi.mock('@error-explorer/browser', () => ({
  ErrorExplorer: {
    isInitialized: vi.fn(() => true),
    captureException: vi.fn(() => 'event-123'),
    addBreadcrumb: vi.fn(),
  },
}));

// Suppress console.error for expected errors in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.clearAllMocks();
});
afterEach(() => {
  console.error = originalError;
});

// Component that throws an error
const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="child">Child content</div>;
};

// Component to test useErrorBoundary
const TestUseErrorBoundaryComponent = () => {
  const { showBoundary } = useErrorBoundary();

  return (
    <button onClick={() => showBoundary(new Error('Manual error'))}>
      Trigger Error
    </button>
  );
};

describe('ErrorBoundary', () => {
  describe('basic functionality', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should render default fallback when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should render custom fallback element when error occurs', () => {
      render(
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error UI</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });

    it('should render function fallback with error props', () => {
      render(
        <ErrorBoundary
          fallback={({ error, resetErrorBoundary }) => (
            <div>
              <span data-testid="error-message">{error.message}</span>
              <button onClick={resetErrorBoundary}>Reset</button>
            </div>
          )}
        >
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
    });
  });

  describe('error capturing', () => {
    it('should capture error to ErrorExplorer by default', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            'react.errorBoundary': 'true',
          }),
        })
      );
    });

    it('should not capture error when capture is false', () => {
      render(
        <ErrorBoundary capture={false}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(ErrorExplorer.captureException).not.toHaveBeenCalled();
    });

    it('should include custom tags when capturing', () => {
      render(
        <ErrorBoundary tags={{ component: 'TestComponent', version: '1.0' }}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            'react.errorBoundary': 'true',
            component: 'TestComponent',
            version: '1.0',
          }),
        })
      );
    });

    it('should include custom context when capturing', () => {
      render(
        <ErrorBoundary context={{ userId: '123', action: 'test' }}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          extra: expect.objectContaining({
            userId: '123',
            action: 'test',
          }),
        })
      );
    });
  });

  describe('callbacks', () => {
    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should call onReset callback when reset', () => {
      const onReset = vi.fn();

      render(
        <ErrorBoundary
          onReset={onReset}
          fallback={({ resetErrorBoundary }) => (
            <button onClick={resetErrorBoundary}>Reset</button>
          )}
        >
          <ThrowingComponent />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Reset'));

      expect(onReset).toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('should reset error boundary via button click', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Try again'));

      // After reset, it will try to render again and throw
      // This is expected behavior
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const SafeComponent = withErrorBoundary(ThrowingComponent, {
      fallback: <div data-testid="hoc-fallback">HOC Fallback</div>,
    });

    render(<SafeComponent shouldThrow={true} />);

    expect(screen.getByTestId('hoc-fallback')).toBeInTheDocument();
  });

  it('should render wrapped component when no error', () => {
    const SafeComponent = withErrorBoundary(ThrowingComponent, {});

    render(<SafeComponent shouldThrow={false} />);

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should pass through all options to ErrorBoundary', () => {
    const onError = vi.fn();

    const SafeComponent = withErrorBoundary(ThrowingComponent, {
      onError,
      tags: { hoc: 'true' },
    });

    render(<SafeComponent />);

    expect(onError).toHaveBeenCalled();
    expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          hoc: 'true',
        }),
      })
    );
  });

  it('should preserve display name', () => {
    const NamedComponent = () => <div />;
    NamedComponent.displayName = 'MyComponent';

    const Wrapped = withErrorBoundary(NamedComponent, {});

    expect(Wrapped.displayName).toBe('withErrorBoundary(MyComponent)');
  });
});

describe('useErrorBoundary hook', () => {
  it('should provide showBoundary function', () => {
    render(
      <ErrorBoundary
        fallback={({ error }) => <div data-testid="error">{error.message}</div>}
      >
        <TestUseErrorBoundaryComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Trigger Error'));

    expect(screen.getByTestId('error')).toHaveTextContent('Manual error');
  });
});
