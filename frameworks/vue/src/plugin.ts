/**
 * Vue Plugin for Error Explorer
 */

import type { App, ComponentPublicInstance, Plugin } from 'vue';
import type { Router } from 'vue-router';
import { ErrorExplorer } from '@error-explorer/browser';
import type { VueErrorExplorerOptions, VueComponentContext } from './types';
import { setupRouterIntegration } from './router';

/**
 * Get component name from instance
 */
function getComponentName(instance: ComponentPublicInstance | null): string | undefined {
  if (!instance) return undefined;

  const options = instance.$.type as { name?: string; __name?: string; __file?: string };

  return options.name || options.__name || extractNameFromFile(options.__file);
}

/**
 * Extract component name from file path
 */
function extractNameFromFile(file?: string): string | undefined {
  if (!file) return undefined;

  const match = file.match(/([^/\\]+)\.vue$/);
  return match ? match[1] : undefined;
}

/**
 * Get component trace (parent hierarchy)
 */
function getComponentTrace(instance: ComponentPublicInstance | null): string[] {
  const trace: string[] = [];
  let current = instance;

  while (current) {
    const name = getComponentName(current);
    if (name) {
      trace.push(name);
    }
    current = current.$.parent?.proxy ?? null;
  }

  return trace;
}

/**
 * Serialize component props with depth limit
 */
function serializeProps(
  props: Record<string, unknown>,
  maxDepth: number
): Record<string, unknown> {
  const serialize = (value: unknown, depth: number): unknown => {
    if (depth > maxDepth) {
      return '[Max depth reached]';
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'function') {
      return '[Function]';
    }

    if (typeof value === 'symbol') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Error) {
      return { name: value.name, message: value.message };
    }

    if (Array.isArray(value)) {
      return value.slice(0, 10).map(item => serialize(item, depth + 1));
    }

    if (typeof value === 'object') {
      const serialized: Record<string, unknown> = {};
      const keys = Object.keys(value as Record<string, unknown>).slice(0, 20);

      for (const key of keys) {
        serialized[key] = serialize((value as Record<string, unknown>)[key], depth + 1);
      }

      return serialized;
    }

    return value;
  };

  return serialize(props, 0) as Record<string, unknown>;
}

/**
 * Build Vue component context
 */
function buildVueContext(
  instance: ComponentPublicInstance | null,
  info: string,
  options: VueErrorExplorerOptions
): VueComponentContext {
  const context: VueComponentContext = {
    info,
  };

  if (options.captureComponentName !== false && instance) {
    context.name = getComponentName(instance);

    const type = instance.$.type as { __file?: string };
    if (type.__file) {
      context.file = type.__file;
    }

    context.trace = getComponentTrace(instance);
  }

  if (options.captureComponentProps && instance) {
    const props = instance.$.props;
    if (props && Object.keys(props).length > 0) {
      context.props = serializeProps(props, options.propsDepth ?? 2);
    }
  }

  return context;
}

/**
 * Original handlers storage
 */
let originalErrorHandler: ((err: unknown, instance: ComponentPublicInstance | null, info: string) => void) | undefined;
let originalWarnHandler: ((msg: string, instance: ComponentPublicInstance | null, trace: string) => void) | undefined;

/**
 * Setup Vue error handler
 */
function setupErrorHandler(app: App, options: VueErrorExplorerOptions): void {
  if (options.vueErrorHandler === false) {
    return;
  }

  // Save original handler
  originalErrorHandler = app.config.errorHandler;

  app.config.errorHandler = (err: unknown, instance: ComponentPublicInstance | null, info: string) => {
    // Check if we should capture
    if (options.beforeVueCapture) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (!options.beforeVueCapture(error, instance, info)) {
        // Call original handler if exists
        if (originalErrorHandler) {
          originalErrorHandler(err, instance, info);
        }
        return;
      }
    }

    // Build Vue context
    const vueContext = buildVueContext(instance, info, options);

    // Add breadcrumb for the error
    ErrorExplorer.addBreadcrumb({
      type: 'error',
      category: 'vue.error',
      message: err instanceof Error ? err.message : String(err),
      level: 'error',
      data: {
        component: vueContext.name,
        info: vueContext.info,
      },
    });

    // Capture the error
    const error = err instanceof Error ? err : new Error(String(err));
    ErrorExplorer.captureException(error, {
      tags: {
        'vue.component': vueContext.name || 'unknown',
        'vue.info': info,
      },
      extra: {
        vue: vueContext,
      },
    });

    // Call original handler if exists
    if (originalErrorHandler) {
      originalErrorHandler(err, instance, info);
    }

    // Re-throw in development for better DX
    if (options.environment === 'development' || import.meta.env?.DEV) {
      console.error('[Vue Error]', err);
    }
  };
}

/**
 * Setup Vue warning handler
 */
function setupWarnHandler(app: App, options: VueErrorExplorerOptions): void {
  // Default: only in development
  const enableWarn = options.vueWarnHandler ?? (
    options.environment === 'development' || import.meta.env?.DEV
  );

  if (!enableWarn) {
    return;
  }

  // Save original handler
  originalWarnHandler = app.config.warnHandler;

  app.config.warnHandler = (msg: string, instance: ComponentPublicInstance | null, trace: string) => {
    const componentName = getComponentName(instance);

    // Add breadcrumb for the warning
    ErrorExplorer.addBreadcrumb({
      type: 'debug',
      category: 'vue.warn',
      message: msg,
      level: 'warning',
      data: {
        component: componentName,
        trace: trace.split('\n').slice(0, 5),
      },
    });

    // Call original handler if exists
    if (originalWarnHandler) {
      originalWarnHandler(msg, instance, trace);
    }

    // Log to console in development
    if (import.meta.env?.DEV) {
      console.warn('[Vue Warn]', msg);
      if (trace) {
        console.warn(trace);
      }
    }
  };
}

/**
 * Router cleanup function storage
 */
let routerCleanup: (() => void) | null = null;

/**
 * Setup router integration if configured
 */
function setupRouter(options: VueErrorExplorerOptions): void {
  if (options.router === false || options.router === undefined) {
    return;
  }

  let router: Router;
  let routerOptions = {};

  if ('instance' in options.router) {
    // Object with instance and options
    router = options.router.instance;
    routerOptions = options.router.options || {};
  } else {
    // Direct Router instance
    router = options.router;
  }

  routerCleanup = setupRouterIntegration(router, routerOptions);
}

/**
 * Restore original handlers
 */
export function restoreHandlers(app: App): void {
  if (originalErrorHandler !== undefined) {
    app.config.errorHandler = originalErrorHandler;
    originalErrorHandler = undefined;
  }

  if (originalWarnHandler !== undefined) {
    app.config.warnHandler = originalWarnHandler;
    originalWarnHandler = undefined;
  }

  if (routerCleanup) {
    routerCleanup();
    routerCleanup = null;
  }
}

/**
 * Create Vue plugin for Error Explorer
 */
export function createErrorExplorerPlugin(options: VueErrorExplorerOptions = {} as VueErrorExplorerOptions): Plugin {
  return {
    install(app: App) {
      // Initialize Error Explorer if not already done
      if (!ErrorExplorer.isInitialized()) {
        ErrorExplorer.init(options);
      }

      // Setup handlers
      setupErrorHandler(app, options);
      setupWarnHandler(app, options);

      // Setup router integration if configured
      setupRouter(options);

      // Provide Error Explorer instance globally
      app.provide('errorExplorer', ErrorExplorer);

      // Add global property for Options API access
      app.config.globalProperties.$errorExplorer = ErrorExplorer;

      // Add breadcrumb for app mount
      ErrorExplorer.addBreadcrumb({
        type: 'navigation',
        category: 'vue.lifecycle',
        message: 'Vue app mounted',
        level: 'info',
      });
    },
  };
}

// Declare module augmentation for global properties
declare module 'vue' {
  interface ComponentCustomProperties {
    $errorExplorer: typeof ErrorExplorer;
  }
}
