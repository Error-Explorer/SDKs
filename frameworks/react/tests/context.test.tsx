/**
 * Tests for ErrorExplorerProvider and context
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ErrorExplorerProvider, ErrorExplorerContext, initErrorExplorer } from '../src/context';
import { useContext } from 'react';

// Mock ErrorExplorer
vi.mock('@error-explorer/browser', () => ({
  ErrorExplorer: {
    isInitialized: vi.fn(() => false),
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
  (ErrorExplorer.isInitialized as ReturnType<typeof vi.fn>).mockReturnValue(false);
});

// Component to test context value
const ContextConsumer = () => {
  const context = useContext(ErrorExplorerContext);

  if (!context) {
    return <div data-testid="no-context">No context</div>;
  }

  return (
    <div data-testid="context-value">
      <span data-testid="initialized">{String(context.isInitialized)}</span>
    </div>
  );
};

// Component to test context methods
const ContextMethodTester = ({ onReady }: { onReady: (ctx: any) => void }) => {
  const context = useContext(ErrorExplorerContext);

  React.useEffect(() => {
    if (context) {
      onReady(context);
    }
  }, [context, onReady]);

  return <div data-testid="tester">Tester</div>;
};

describe('ErrorExplorerProvider', () => {
  describe('initialization', () => {
    it('should initialize ErrorExplorer on mount', async () => {
      const options = {
        token: 'ee_test_token',
        project: 'test-project',
        environment: 'test',
      };

      render(
        <ErrorExplorerProvider options={options}>
          <ContextConsumer />
        </ErrorExplorerProvider>
      );

      await waitFor(() => {
        expect(ErrorExplorer.init).toHaveBeenCalledWith(options);
      });
    });

    it('should not re-initialize if already initialized', async () => {
      (ErrorExplorer.isInitialized as ReturnType<typeof vi.fn>).mockReturnValue(true);

      render(
        <ErrorExplorerProvider options={{ token: 'test', project: 'test' }}>
          <ContextConsumer />
        </ErrorExplorerProvider>
      );

      await waitFor(() => {
        expect(ErrorExplorer.init).not.toHaveBeenCalled();
      });
    });

    it('should provide isInitialized status in context', async () => {
      (ErrorExplorer.isInitialized as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(false)
        .mockReturnValue(true);

      render(
        <ErrorExplorerProvider options={{ token: 'test', project: 'test' }}>
          <ContextConsumer />
        </ErrorExplorerProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });
    });
  });

  describe('context value', () => {
    it('should provide all SDK methods in context', async () => {
      const capturedContext: any = {};

      render(
        <ErrorExplorerProvider options={{ token: 'test', project: 'test' }}>
          <ContextMethodTester
            onReady={(ctx) => Object.assign(capturedContext, ctx)}
          />
        </ErrorExplorerProvider>
      );

      await waitFor(() => {
        expect(capturedContext.captureException).toBeDefined();
        expect(capturedContext.captureMessage).toBeDefined();
        expect(capturedContext.addBreadcrumb).toBeDefined();
        expect(capturedContext.setUser).toBeDefined();
        expect(capturedContext.clearUser).toBeDefined();
        expect(capturedContext.setTag).toBeDefined();
        expect(capturedContext.setTags).toBeDefined();
        expect(capturedContext.setExtra).toBeDefined();
        expect(capturedContext.setContext).toBeDefined();
        expect(capturedContext.flush).toBeDefined();
        expect(capturedContext.close).toBeDefined();
      });
    });

    it('should call ErrorExplorer methods when context methods are called', async () => {
      const capturedContext: any = {};

      render(
        <ErrorExplorerProvider options={{ token: 'test', project: 'test' }}>
          <ContextMethodTester
            onReady={(ctx) => Object.assign(capturedContext, ctx)}
          />
        </ErrorExplorerProvider>
      );

      await waitFor(() => {
        expect(capturedContext.captureException).toBeDefined();
      });

      // Test captureException
      capturedContext.captureException(new Error('Test'), { tags: { test: 'true' } });
      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        { tags: { test: 'true' } }
      );

      // Test captureMessage
      capturedContext.captureMessage('Test message', 'warning');
      expect(ErrorExplorer.captureMessage).toHaveBeenCalledWith('Test message', 'warning');

      // Test addBreadcrumb
      capturedContext.addBreadcrumb({ type: 'test', message: 'test' });
      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({ type: 'test', message: 'test' });

      // Test setUser
      capturedContext.setUser({ id: 'user-123' });
      expect(ErrorExplorer.setUser).toHaveBeenCalledWith({ id: 'user-123' });

      // Test clearUser
      capturedContext.clearUser();
      expect(ErrorExplorer.clearUser).toHaveBeenCalled();

      // Test setTag
      capturedContext.setTag('key', 'value');
      expect(ErrorExplorer.setTag).toHaveBeenCalledWith('key', 'value');

      // Test setTags
      capturedContext.setTags({ key1: 'value1' });
      expect(ErrorExplorer.setTags).toHaveBeenCalledWith({ key1: 'value1' });

      // Test setExtra
      capturedContext.setExtra({ extra: 'data' });
      expect(ErrorExplorer.setExtra).toHaveBeenCalledWith({ extra: 'data' });

      // Test setContext
      capturedContext.setContext('custom', { data: 123 });
      expect(ErrorExplorer.setContext).toHaveBeenCalledWith('custom', { data: 123 });
    });
  });

  describe('children rendering', () => {
    it('should render children', () => {
      render(
        <ErrorExplorerProvider options={{ token: 'test', project: 'test' }}>
          <div data-testid="child">Child content</div>
        </ErrorExplorerProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ErrorExplorerProvider options={{ token: 'test', project: 'test' }}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </ErrorExplorerProvider>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });
});

describe('ErrorExplorerContext', () => {
  it('should return null when used outside provider', () => {
    render(<ContextConsumer />);

    expect(screen.getByTestId('no-context')).toBeInTheDocument();
  });
});

describe('initErrorExplorer', () => {
  it('should initialize ErrorExplorer when not initialized', () => {
    (ErrorExplorer.isInitialized as ReturnType<typeof vi.fn>).mockReturnValue(false);

    initErrorExplorer({
      token: 'ee_test_token',
      project: 'test-project',
    });

    expect(ErrorExplorer.init).toHaveBeenCalledWith({
      token: 'ee_test_token',
      project: 'test-project',
    });
  });

  it('should not initialize ErrorExplorer when already initialized', () => {
    (ErrorExplorer.isInitialized as ReturnType<typeof vi.fn>).mockReturnValue(true);

    initErrorExplorer({
      token: 'ee_test_token',
      project: 'test-project',
    });

    expect(ErrorExplorer.init).not.toHaveBeenCalled();
  });
});
