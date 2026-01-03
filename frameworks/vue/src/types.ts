/**
 * Types for @error-explorer/vue
 */

import type { App, ComponentPublicInstance } from 'vue';
import type { InitOptions, UserContext, Breadcrumb, CaptureContext } from '@error-explorer/browser';

/**
 * Vue-specific initialization options
 */
export interface VueErrorExplorerOptions extends InitOptions {
  /**
   * Vue application instance (optional - can be set via plugin install)
   */
  app?: App;

  /**
   * Enable Vue error handler integration
   * @default true
   */
  vueErrorHandler?: boolean;

  /**
   * Enable Vue warning handler integration
   * @default true in development, false in production
   */
  vueWarnHandler?: boolean;

  /**
   * Enable Vue Router integration for navigation breadcrumbs
   * @default true
   */
  router?: boolean;

  /**
   * Capture component name in error context
   * @default true
   */
  captureComponentName?: boolean;

  /**
   * Capture component props in error context (be careful with sensitive data)
   * @default false
   */
  captureComponentProps?: boolean;

  /**
   * Maximum depth for serializing component props
   * @default 2
   */
  propsDepth?: number;

  /**
   * Hook called before capturing a Vue error
   * Return false to skip capturing
   */
  beforeVueCapture?: (
    error: Error,
    instance: ComponentPublicInstance | null,
    info: string
  ) => boolean;
}

/**
 * Vue component context captured with errors
 */
export interface VueComponentContext {
  /**
   * Component name
   */
  name?: string;

  /**
   * Component file path (if available)
   */
  file?: string;

  /**
   * Component props (if enabled)
   */
  props?: Record<string, unknown>;

  /**
   * Vue error info string (e.g., "render function", "watcher callback")
   */
  info?: string;

  /**
   * Component trace (parent hierarchy)
   */
  trace?: string[];
}

/**
 * Vue plugin install function type
 */
export type VuePluginInstall = (app: App, options?: VueErrorExplorerOptions) => void;

/**
 * ErrorBoundary component props
 */
export interface ErrorBoundaryProps {
  /**
   * Callback when an error is caught
   */
  onError?: (error: Error, info: string) => void;

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
   * Fallback content to render when an error occurs
   * Can be a VNode or a render function receiving error and reset callback
   */
  fallback?: unknown;
}

/**
 * ErrorBoundary exposed methods
 */
export interface ErrorBoundaryExposed {
  /**
   * Reset the error state
   */
  reset: () => void;

  /**
   * Current error (if any)
   */
  error: Error | null;
}

// Re-export browser types
export type { InitOptions, UserContext, Breadcrumb, CaptureContext };
