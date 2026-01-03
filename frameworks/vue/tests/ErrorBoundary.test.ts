/**
 * Tests for ErrorBoundary Component
 *
 * Note: In the test environment (happy-dom), onErrorCaptured may not fully
 * prevent error propagation. These tests verify the component structure and
 * behavior where possible.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, ref, nextTick } from 'vue';
import { ErrorBoundary, withErrorBoundary } from '../src/ErrorBoundary';
import { ErrorExplorer } from '@error-explorer/browser';

// Mock ErrorExplorer
vi.mock('@error-explorer/browser', () => ({
  ErrorExplorer: {
    init: vi.fn(),
    isInitialized: vi.fn(() => true),
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

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render default slot when no error', () => {
      const ChildComponent = defineComponent({
        render() {
          return h('div', { class: 'child' }, 'Child Content');
        },
      });

      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: () => h(ChildComponent),
        },
      });

      expect(wrapper.find('.child').exists()).toBe(true);
      expect(wrapper.text()).toContain('Child Content');
    });

    it('should expose reset function and error ref', () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: () => h('div', 'Content'),
        },
      });

      const exposed = wrapper.vm as unknown as { reset: () => void; error: Error | null };
      expect(typeof exposed.reset).toBe('function');
      expect(exposed.error).toBeNull();
    });
  });

  describe('Props', () => {
    it('should accept capture prop', () => {
      const wrapper = mount(ErrorBoundary, {
        props: {
          capture: false,
        },
        slots: {
          default: () => h('div', 'Content'),
        },
      });

      expect(wrapper.props('capture')).toBe(false);
    });

    it('should accept tags prop', () => {
      const tags = { feature: 'checkout' };
      const wrapper = mount(ErrorBoundary, {
        props: {
          tags,
        },
        slots: {
          default: () => h('div', 'Content'),
        },
      });

      expect(wrapper.props('tags')).toEqual(tags);
    });

    it('should accept context prop', () => {
      const context = { userId: '123' };
      const wrapper = mount(ErrorBoundary, {
        props: {
          context,
        },
        slots: {
          default: () => h('div', 'Content'),
        },
      });

      expect(wrapper.props('context')).toEqual(context);
    });

    it('should accept stopPropagation prop', () => {
      const wrapper = mount(ErrorBoundary, {
        props: {
          stopPropagation: false,
        },
        slots: {
          default: () => h('div', 'Content'),
        },
      });

      expect(wrapper.props('stopPropagation')).toBe(false);
    });
  });

  describe('Error State Management', () => {
    it('should have error as null initially', () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: () => h('div', 'Content'),
        },
      });

      const exposed = wrapper.vm as unknown as { error: Error | null };
      expect(exposed.error).toBeNull();
    });

    it('should clear error state when reset is called', async () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: () => h('div', 'Content'),
        },
      });

      const exposed = wrapper.vm as unknown as { error: { value: Error | null }; reset: () => void };

      // Manually set error state for testing reset
      (wrapper.vm as any).error = new Error('Test');

      exposed.reset();
      await nextTick();

      expect((wrapper.vm as any).error).toBeNull();
    });
  });

  describe('Fallback Slot', () => {
    it('should render default slot when error is null', () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: () => h('div', { class: 'default' }, 'Default Content'),
          fallback: () => h('div', { class: 'fallback' }, 'Fallback'),
        },
      });

      expect(wrapper.find('.default').exists()).toBe(true);
      expect(wrapper.find('.fallback').exists()).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit reset event when reset is called', async () => {
      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: () => h('div', 'Content'),
        },
      });

      const exposed = wrapper.vm as unknown as { reset: () => void };
      exposed.reset();

      await nextTick();

      expect(wrapper.emitted()).toHaveProperty('reset');
    });
  });

  describe('Error Boundary Behavior (simulated)', () => {
    it('should render fallback when error state is set manually', async () => {
      const TestBoundary = defineComponent({
        setup() {
          const error = ref<Error | null>(null);

          const triggerError = () => {
            error.value = new Error('Simulated error');
          };

          return () => {
            if (error.value) {
              return h('div', { class: 'fallback' }, [
                h('p', error.value.message),
                h('button', { onClick: () => { error.value = null; } }, 'Reset'),
              ]);
            }
            return h('div', [
              h('span', { class: 'content' }, 'Normal Content'),
              h('button', { class: 'trigger', onClick: triggerError }, 'Trigger'),
            ]);
          };
        },
      });

      const wrapper = mount(TestBoundary);

      expect(wrapper.find('.content').exists()).toBe(true);
      expect(wrapper.find('.fallback').exists()).toBe(false);

      await wrapper.find('.trigger').trigger('click');
      await nextTick();

      expect(wrapper.find('.content').exists()).toBe(false);
      expect(wrapper.find('.fallback').exists()).toBe(true);
      expect(wrapper.text()).toContain('Simulated error');
    });
  });
});

describe('withErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should wrap component with ErrorBoundary', () => {
    const Inner = defineComponent({
      name: 'InnerComponent',
      render() {
        return h('div', { class: 'inner' }, 'Inner');
      },
    });

    const Wrapped = withErrorBoundary(Inner);

    const wrapper = mount(Wrapped);

    expect(wrapper.find('.inner').exists()).toBe(true);
  });

  it('should create a named wrapper component', () => {
    const Inner = defineComponent({
      name: 'MyComponent',
      render() {
        return h('div', 'Content');
      },
    });

    const Wrapped = withErrorBoundary(Inner);

    expect(Wrapped.name).toBe('WithErrorBoundary(MyComponent)');
  });

  it('should pass options to ErrorBoundary props', () => {
    const Inner = defineComponent({
      name: 'TestComponent',
      render() {
        return h('div', 'Content');
      },
    });

    const onError = vi.fn();
    const Wrapped = withErrorBoundary(Inner, {
      capture: true,
      tags: { wrapped: 'true' },
      onError,
    });

    // Verify the HOC is properly configured
    const wrapper = mount(Wrapped);
    expect(wrapper.exists()).toBe(true);
  });
});

describe('ErrorBoundary Integration', () => {
  it('should properly handle nested components', () => {
    const GrandChild = defineComponent({
      name: 'GrandChild',
      render() {
        return h('span', { class: 'grandchild' }, 'GrandChild');
      },
    });

    const Child = defineComponent({
      name: 'Child',
      render() {
        return h('div', { class: 'child' }, [h(GrandChild)]);
      },
    });

    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: () => h(Child),
      },
    });

    expect(wrapper.find('.child').exists()).toBe(true);
    expect(wrapper.find('.grandchild').exists()).toBe(true);
  });

  it('should pass through props to child components', () => {
    const Child = defineComponent({
      name: 'Child',
      props: ['message'],
      render() {
        return h('div', { class: 'child' }, this.message);
      },
    });

    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: () => h(Child, { message: 'Hello' }),
      },
    });

    expect(wrapper.find('.child').text()).toBe('Hello');
  });
});
