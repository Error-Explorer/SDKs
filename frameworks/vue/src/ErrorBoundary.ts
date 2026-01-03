/**
 * ErrorBoundary component for Vue 3
 * Catches errors in child components and reports them to Error Explorer
 */

import {
  defineComponent,
  h,
  ref,
  onErrorCaptured,
  type PropType,
  type VNode,
  type Slot,
} from 'vue';
import { ErrorExplorer } from '@error-explorer/browser';

/**
 * ErrorBoundary component
 *
 * Usage:
 * ```vue
 * <ErrorBoundary @error="handleError" :fallback="ErrorFallback">
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * Or with scoped slot for fallback:
 * ```vue
 * <ErrorBoundary>
 *   <template #default>
 *     <MyComponent />
 *   </template>
 *   <template #fallback="{ error, reset }">
 *     <div>
 *       <p>Error: {{ error.message }}</p>
 *       <button @click="reset">Retry</button>
 *     </div>
 *   </template>
 * </ErrorBoundary>
 * ```
 */
export const ErrorBoundary = defineComponent({
  name: 'ErrorBoundary',

  props: {
    /**
     * Whether to capture the error to Error Explorer
     */
    capture: {
      type: Boolean,
      default: true,
    },

    /**
     * Additional tags to add when capturing
     */
    tags: {
      type: Object as PropType<Record<string, string>>,
      default: () => ({}),
    },

    /**
     * Additional context to add when capturing
     */
    context: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },

    /**
     * Fallback component to render when an error occurs
     */
    fallback: {
      type: [Object, Function, null] as PropType<VNode | (() => VNode) | null>,
      default: null,
    },

    /**
     * Whether to stop error propagation
     */
    stopPropagation: {
      type: Boolean,
      default: true,
    },
  },

  emits: {
    /**
     * Emitted when an error is caught
     */
    error: (error: Error, info: string) => true,

    /**
     * Emitted when the error state is reset
     */
    reset: () => true,
  },

  setup(props, { slots, emit, expose }) {
    const error = ref<Error | null>(null);
    const errorInfo = ref<string>('');

    /**
     * Reset the error state
     */
    const reset = () => {
      error.value = null;
      errorInfo.value = '';
      emit('reset');
    };

    // Capture errors from child components
    onErrorCaptured((err: unknown, instance, info: string) => {
      const capturedError = err instanceof Error ? err : new Error(String(err));

      error.value = capturedError;
      errorInfo.value = info;

      // Emit error event
      emit('error', capturedError, info);

      // Add breadcrumb
      ErrorExplorer.addBreadcrumb({
        type: 'error',
        category: 'vue.errorBoundary',
        message: capturedError.message,
        level: 'error',
        data: {
          info,
          component: instance?.$.type
            ? (instance.$.type as { name?: string }).name
            : undefined,
        },
      });

      // Capture to Error Explorer if enabled
      if (props.capture) {
        ErrorExplorer.captureException(capturedError, {
          tags: {
            'errorBoundary': 'true',
            'vue.info': info,
            ...props.tags,
          },
          extra: {
            errorBoundary: {
              info,
              context: props.context,
            },
          },
        });
      }

      // Return true to stop propagation, false to continue
      return props.stopPropagation;
    });

    // Expose methods and state
    expose({
      reset,
      error,
    });

    return () => {
      // If there's an error, render fallback
      if (error.value) {
        // Check for fallback slot
        if (slots.fallback) {
          return slots.fallback({
            error: error.value,
            info: errorInfo.value,
            reset,
          });
        }

        // Check for fallback prop
        if (props.fallback) {
          if (typeof props.fallback === 'function') {
            return props.fallback();
          }
          return props.fallback;
        }

        // Default fallback
        return h('div', { class: 'error-boundary-fallback' }, [
          h('p', { style: 'color: red;' }, `Error: ${error.value.message}`),
          h(
            'button',
            {
              onClick: reset,
              style: 'margin-top: 8px; padding: 4px 12px; cursor: pointer;',
            },
            'Try Again'
          ),
        ]);
      }

      // No error, render default slot
      return slots.default?.();
    };
  },
});

/**
 * Higher-order component to wrap a component with ErrorBoundary
 */
export function withErrorBoundary<T extends { new (): any }>(
  Component: T,
  options: {
    capture?: boolean;
    tags?: Record<string, string>;
    context?: Record<string, unknown>;
    fallback?: VNode | (() => VNode);
    onError?: (error: Error, info: string) => void;
  } = {}
) {
  return defineComponent({
    name: `WithErrorBoundary(${(Component as any).name || 'Component'})`,

    setup(_, { attrs, slots }) {
      return () =>
        h(
          ErrorBoundary,
          {
            capture: options.capture ?? true,
            tags: options.tags ?? {},
            context: options.context ?? {},
            fallback: options.fallback ?? null,
            onError: options.onError,
          },
          {
            default: () => h(Component as any, attrs, slots),
          }
        );
    },
  });
}

export type ErrorBoundaryInstance = InstanceType<typeof ErrorBoundary>;
