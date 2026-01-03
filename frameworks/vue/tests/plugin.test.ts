/**
 * Tests for Vue Plugin
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { createErrorExplorerPlugin, restoreHandlers } from '../src/plugin';
import { ErrorExplorer } from '@error-explorer/browser';

// Mock ErrorExplorer
vi.mock('@error-explorer/browser', () => ({
  ErrorExplorer: {
    init: vi.fn(),
    isInitialized: vi.fn(() => false),
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

describe('Vue Plugin', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ErrorExplorer.isInitialized).mockReturnValue(false);
  });

  afterEach(() => {
    if (app) {
      app.unmount();
    }
  });

  describe('createErrorExplorerPlugin', () => {
    it('should create a plugin that initializes ErrorExplorer', () => {
      const TestComponent = defineComponent({
        render() {
          return h('div', 'Test');
        },
      });

      app = createApp(TestComponent);
      app.use(createErrorExplorerPlugin({
        token: 'test_token',
        environment: 'test',
      }));

      const container = document.createElement('div');
      app.mount(container);

      expect(ErrorExplorer.init).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test_token',
          environment: 'test',
        })
      );
    });

    it('should not re-initialize if already initialized', () => {
      vi.mocked(ErrorExplorer.isInitialized).mockReturnValue(true);

      const TestComponent = defineComponent({
        render() {
          return h('div', 'Test');
        },
      });

      app = createApp(TestComponent);
      app.use(createErrorExplorerPlugin({
        token: 'test_token',
      }));

      const container = document.createElement('div');
      app.mount(container);

      expect(ErrorExplorer.init).not.toHaveBeenCalled();
    });

    it('should add breadcrumb on app mount', () => {
      const TestComponent = defineComponent({
        render() {
          return h('div', 'Test');
        },
      });

      app = createApp(TestComponent);
      app.use(createErrorExplorerPlugin({
        token: 'test_token',
      }));

      const container = document.createElement('div');
      app.mount(container);

      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigation',
          category: 'vue.lifecycle',
          message: 'Vue app mounted',
        })
      );
    });

    it('should provide ErrorExplorer globally', () => {
      let injectedValue: unknown = null;

      const TestComponent = defineComponent({
        setup() {
          const { inject } = require('vue');
          injectedValue = inject('errorExplorer');
          return () => h('div', 'Test');
        },
      });

      app = createApp(TestComponent);
      app.use(createErrorExplorerPlugin({
        token: 'test_token',
      }));

      const container = document.createElement('div');
      app.mount(container);

      expect(injectedValue).toBe(ErrorExplorer);
    });

    it('should add global property $errorExplorer', () => {
      const TestComponent = defineComponent({
        render() {
          return h('div', 'Test');
        },
      });

      app = createApp(TestComponent);
      app.use(createErrorExplorerPlugin({
        token: 'test_token',
      }));

      expect(app.config.globalProperties.$errorExplorer).toBe(ErrorExplorer);
    });
  });

  describe('Error Handler', () => {
    it('should capture Vue errors', async () => {
      const error = new Error('Test Vue Error');

      const ErrorComponent = defineComponent({
        setup() {
          throw error;
        },
        render() {
          return h('div');
        },
      });

      const TestComponent = defineComponent({
        render() {
          return h(ErrorComponent);
        },
      });

      app = createApp(TestComponent);
      app.use(createErrorExplorerPlugin({
        token: 'test_token',
      }));

      // Suppress console errors
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const container = document.createElement('div');
      try {
        app.mount(container);
      } catch (e) {
        // Expected
      }

      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            'vue.component': expect.any(String),
          }),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should not capture errors when vueErrorHandler is false', () => {
      const error = new Error('Test Error');

      const ErrorComponent = defineComponent({
        setup() {
          throw error;
        },
        render() {
          return h('div');
        },
      });

      const TestComponent = defineComponent({
        render() {
          return h(ErrorComponent);
        },
      });

      app = createApp(TestComponent);
      app.use(createErrorExplorerPlugin({
        token: 'test_token',
        vueErrorHandler: false,
      }));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const container = document.createElement('div');
      try {
        app.mount(container);
      } catch (e) {
        // Expected
      }

      expect(ErrorExplorer.captureException).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should call beforeVueCapture hook', async () => {
      const error = new Error('Test Error');
      const beforeCapture = vi.fn(() => true);

      const ErrorComponent = defineComponent({
        setup() {
          throw error;
        },
        render() {
          return h('div');
        },
      });

      const TestComponent = defineComponent({
        render() {
          return h(ErrorComponent);
        },
      });

      app = createApp(TestComponent);
      app.use(createErrorExplorerPlugin({
        token: 'test_token',
        beforeVueCapture: beforeCapture,
      }));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const container = document.createElement('div');
      try {
        app.mount(container);
      } catch (e) {
        // Expected
      }

      // Vue passes the component instance (which may be an object) and the error info string
      expect(beforeCapture).toHaveBeenCalledWith(
        error,
        expect.anything(), // instance can be null or component instance object
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    it('should skip capture when beforeVueCapture returns false', () => {
      const error = new Error('Test Error');

      const ErrorComponent = defineComponent({
        setup() {
          throw error;
        },
        render() {
          return h('div');
        },
      });

      const TestComponent = defineComponent({
        render() {
          return h(ErrorComponent);
        },
      });

      app = createApp(TestComponent);
      app.use(createErrorExplorerPlugin({
        token: 'test_token',
        beforeVueCapture: () => false,
      }));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const container = document.createElement('div');
      try {
        app.mount(container);
      } catch (e) {
        // Expected
      }

      expect(ErrorExplorer.captureException).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should add breadcrumb for errors', async () => {
      const error = new Error('Test Error');

      const ErrorComponent = defineComponent({
        setup() {
          throw error;
        },
        render() {
          return h('div');
        },
      });

      const TestComponent = defineComponent({
        render() {
          return h(ErrorComponent);
        },
      });

      app = createApp(TestComponent);
      app.use(createErrorExplorerPlugin({
        token: 'test_token',
      }));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const container = document.createElement('div');
      try {
        app.mount(container);
      } catch (e) {
        // Expected
      }

      expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          category: 'vue.error',
          message: 'Test Error',
          level: 'error',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('restoreHandlers', () => {
    it('should restore original error handler', () => {
      const originalHandler = vi.fn();

      const TestComponent = defineComponent({
        render() {
          return h('div', 'Test');
        },
      });

      app = createApp(TestComponent);
      app.config.errorHandler = originalHandler;

      app.use(createErrorExplorerPlugin({
        token: 'test_token',
      }));

      // Handler should be replaced
      expect(app.config.errorHandler).not.toBe(originalHandler);

      // Restore
      restoreHandlers(app);

      expect(app.config.errorHandler).toBe(originalHandler);
    });
  });
});
