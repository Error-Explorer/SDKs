/**
 * Tests for Vue Composables
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import {
  useErrorExplorer,
  useComponentBreadcrumbs,
  useActionTracker,
  useErrorHandler,
  useUserContext,
} from '../src/composables';
import { ErrorExplorer } from '@error-explorer/browser';

// Mock ErrorExplorer
vi.mock('@error-explorer/browser', () => ({
  ErrorExplorer: {
    init: vi.fn(),
    isInitialized: vi.fn(() => true),
    captureException: vi.fn(() => 'event_123'),
    addBreadcrumb: vi.fn(),
    setUser: vi.fn(),
    clearUser: vi.fn(),
    setTag: vi.fn(),
    setTags: vi.fn(),
    setExtra: vi.fn(),
    setContext: vi.fn(),
    captureMessage: vi.fn(() => 'msg_123'),
    flush: vi.fn(() => Promise.resolve(true)),
    close: vi.fn(() => Promise.resolve(true)),
  },
}));

describe('useErrorExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return ErrorExplorer methods', () => {
    let result: ReturnType<typeof useErrorExplorer> | null = null;

    const TestComponent = defineComponent({
      setup() {
        result = useErrorExplorer();
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(result).not.toBeNull();
    expect(typeof result!.captureException).toBe('function');
    expect(typeof result!.captureMessage).toBe('function');
    expect(typeof result!.addBreadcrumb).toBe('function');
    expect(typeof result!.setUser).toBe('function');
    expect(typeof result!.clearUser).toBe('function');
    expect(typeof result!.setTag).toBe('function');
    expect(typeof result!.setTags).toBe('function');
    expect(typeof result!.setExtra).toBe('function');
    expect(typeof result!.setContext).toBe('function');
    expect(typeof result!.flush).toBe('function');
    expect(typeof result!.close).toBe('function');
    expect(typeof result!.isInitialized).toBe('function');
  });

  it('should call ErrorExplorer.captureException', () => {
    const error = new Error('Test');

    const TestComponent = defineComponent({
      setup() {
        const { captureException } = useErrorExplorer();
        captureException(error, { tags: { test: 'true' } });
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
      error,
      { tags: { test: 'true' } }
    );
  });

  it('should call ErrorExplorer.addBreadcrumb', () => {
    const TestComponent = defineComponent({
      setup() {
        const { addBreadcrumb } = useErrorExplorer();
        addBreadcrumb({
          type: 'user',
          message: 'Test action',
        });
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith({
      type: 'user',
      message: 'Test action',
    });
  });

  it('should call ErrorExplorer.setUser', () => {
    const TestComponent = defineComponent({
      setup() {
        const { setUser } = useErrorExplorer();
        setUser({ id: 'user_123', email: 'test@example.com' });
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(ErrorExplorer.setUser).toHaveBeenCalledWith({
      id: 'user_123',
      email: 'test@example.com',
    });
  });
});

describe('useComponentBreadcrumbs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add breadcrumb on mount', () => {
    const TestComponent = defineComponent({
      name: 'TestComponent',
      setup() {
        useComponentBreadcrumbs();
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'debug',
        category: 'vue.lifecycle',
        message: expect.stringContaining('mounted'),
      })
    );
  });

  it('should add breadcrumb on unmount', () => {
    const TestComponent = defineComponent({
      name: 'UnmountTest',
      setup() {
        useComponentBreadcrumbs();
        return () => h('div');
      },
    });

    const wrapper = mount(TestComponent);
    wrapper.unmount();

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'debug',
        category: 'vue.lifecycle',
        message: expect.stringContaining('unmounted'),
      })
    );
  });
});

describe('useActionTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track actions with trackAction', () => {
    const TestComponent = defineComponent({
      name: 'ActionTracker',
      setup() {
        const { trackAction } = useActionTracker();
        trackAction('button_clicked', { buttonId: 'submit' });
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'user-action',
        category: 'action',
        message: 'button_clicked',
        data: expect.objectContaining({
          buttonId: 'submit',
        }),
      })
    );
  });

  it('should track interactions with trackInteraction', () => {
    const TestComponent = defineComponent({
      name: 'InteractionTracker',
      setup() {
        const { trackInteraction } = useActionTracker();
        trackInteraction('form-input', 'focus', { field: 'email' });
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(ErrorExplorer.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'user-action',
        category: 'ui.focus',
        message: 'focus on form-input',
        data: expect.objectContaining({
          element: 'form-input',
          field: 'email',
        }),
      })
    );
  });
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('should capture exception with context', () => {
      const error = new Error('Handle test');

      const TestComponent = defineComponent({
        name: 'ErrorHandler',
        setup() {
          const { handleError } = useErrorHandler();
          handleError(error, { tags: { custom: 'tag' } });
          return () => h('div');
        },
      });

      mount(TestComponent);

      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            custom: 'tag',
          }),
        })
      );
    });

    it('should convert non-Error to Error', () => {
      const TestComponent = defineComponent({
        setup() {
          const { handleError } = useErrorHandler();
          handleError('string error');
          return () => h('div');
        },
      });

      mount(TestComponent);

      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );

      const capturedError = vi.mocked(ErrorExplorer.captureException).mock.calls[0][0];
      expect(capturedError.message).toBe('string error');
    });

    it('should merge default context', () => {
      const TestComponent = defineComponent({
        name: 'DefaultContext',
        setup() {
          const { handleError } = useErrorHandler({ tags: { default: 'true' } });
          handleError(new Error('Test'), { tags: { custom: 'tag' } });
          return () => h('div');
        },
      });

      mount(TestComponent);

      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            default: 'true',
            custom: 'tag',
          }),
        })
      );
    });
  });

  describe('wrapAsync', () => {
    it('should wrap async function and catch errors', async () => {
      let wrappedFn: ReturnType<ReturnType<typeof useErrorHandler>['wrapAsync']>;
      const error = new Error('Async error');

      const TestComponent = defineComponent({
        setup() {
          const { wrapAsync } = useErrorHandler();
          wrappedFn = wrapAsync(async () => {
            throw error;
          });
          return () => h('div');
        },
      });

      mount(TestComponent);

      const result = await wrappedFn!();

      expect(result).toBeUndefined();
      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        error,
        expect.any(Object)
      );
    });

    it('should return value when no error', async () => {
      let wrappedFn: ReturnType<ReturnType<typeof useErrorHandler>['wrapAsync']>;

      const TestComponent = defineComponent({
        setup() {
          const { wrapAsync } = useErrorHandler();
          wrappedFn = wrapAsync(async () => {
            return 'success';
          });
          return () => h('div');
        },
      });

      mount(TestComponent);

      const result = await wrappedFn!();

      expect(result).toBe('success');
      expect(ErrorExplorer.captureException).not.toHaveBeenCalled();
    });
  });

  describe('tryCatch', () => {
    it('should catch sync errors', () => {
      let tryCatchFn: ReturnType<typeof useErrorHandler>['tryCatch'];
      const error = new Error('Sync error');

      const TestComponent = defineComponent({
        setup() {
          const { tryCatch } = useErrorHandler();
          tryCatchFn = tryCatch;
          return () => h('div');
        },
      });

      mount(TestComponent);

      const result = tryCatchFn!(() => {
        throw error;
      });

      expect(result).toBeUndefined();
      expect(ErrorExplorer.captureException).toHaveBeenCalledWith(
        error,
        expect.any(Object)
      );
    });

    it('should return value when no error', () => {
      let tryCatchFn: ReturnType<typeof useErrorHandler>['tryCatch'];

      const TestComponent = defineComponent({
        setup() {
          const { tryCatch } = useErrorHandler();
          tryCatchFn = tryCatch;
          return () => h('div');
        },
      });

      mount(TestComponent);

      const result = tryCatchFn!(() => 'success');

      expect(result).toBe('success');
      expect(ErrorExplorer.captureException).not.toHaveBeenCalled();
    });
  });
});

describe('useUserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set user from plain object', () => {
    const TestComponent = defineComponent({
      setup() {
        useUserContext({ id: 'user_123', email: 'test@example.com' });
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(ErrorExplorer.setUser).toHaveBeenCalledWith({
      id: 'user_123',
      email: 'test@example.com',
    });
  });

  it('should set user from ref', () => {
    const TestComponent = defineComponent({
      setup() {
        const user = ref({ id: 'user_456', name: 'John' });
        useUserContext(user);
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(ErrorExplorer.setUser).toHaveBeenCalledWith({
      id: 'user_456',
      name: 'John',
    });
  });

  it('should clear user when null', () => {
    const TestComponent = defineComponent({
      setup() {
        useUserContext(null);
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(ErrorExplorer.clearUser).toHaveBeenCalled();
  });

  it('should clear user when ref is null', () => {
    const TestComponent = defineComponent({
      setup() {
        const user = ref(null);
        useUserContext(user);
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(ErrorExplorer.clearUser).toHaveBeenCalled();
  });

  it('should return setUser and clearUser functions', () => {
    let result: ReturnType<typeof useUserContext>;

    const TestComponent = defineComponent({
      setup() {
        result = useUserContext({ id: 'initial' });
        return () => h('div');
      },
    });

    mount(TestComponent);

    expect(typeof result!.setUser).toBe('function');
    expect(typeof result!.clearUser).toBe('function');

    result!.setUser({ id: 'new_user' });
    expect(ErrorExplorer.setUser).toHaveBeenCalledWith({ id: 'new_user' });

    result!.clearUser();
    expect(ErrorExplorer.clearUser).toHaveBeenCalled();
  });
});
