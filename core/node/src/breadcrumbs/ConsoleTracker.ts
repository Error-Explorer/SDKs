/**
 * Console breadcrumb tracker
 * Intercepts console methods to create breadcrumbs
 */

import type { BreadcrumbLevel } from '../types.js';
import { getBreadcrumbManager } from './BreadcrumbManager.js';

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface OriginalConsoleMethods {
  log: typeof console.log;
  info: typeof console.info;
  warn: typeof console.warn;
  error: typeof console.error;
  debug: typeof console.debug;
}

class ConsoleTracker {
  private originalMethods: OriginalConsoleMethods | null = null;
  private started = false;

  /**
   * Start tracking console calls
   */
  start(): void {
    if (this.started) {
      return;
    }

    // Store original methods
    this.originalMethods = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };

    // Wrap each method
    const methods: ConsoleMethod[] = ['log', 'info', 'warn', 'error', 'debug'];
    for (const method of methods) {
      this.wrapConsoleMethod(method);
    }

    this.started = true;
  }

  /**
   * Stop tracking console calls
   */
  stop(): void {
    if (!this.started || !this.originalMethods) {
      return;
    }

    // Restore original methods
    console.log = this.originalMethods.log;
    console.info = this.originalMethods.info;
    console.warn = this.originalMethods.warn;
    console.error = this.originalMethods.error;
    console.debug = this.originalMethods.debug;

    this.originalMethods = null;
    this.started = false;
  }

  /**
   * Wrap a console method to add breadcrumbs
   */
  private wrapConsoleMethod(method: ConsoleMethod): void {
    const original = this.originalMethods![method];
    const self = this;

    console[method] = function (...args: unknown[]): void {
      // Create breadcrumb
      self.addBreadcrumb(method, args);

      // Call original
      original(...args);
    };
  }

  /**
   * Add a breadcrumb for a console call
   */
  private addBreadcrumb(method: ConsoleMethod, args: unknown[]): void {
    const manager = getBreadcrumbManager();
    if (!manager) {
      return;
    }

    const level = this.methodToLevel(method);
    const message = this.formatArgs(args);

    manager.add({
      type: 'console',
      category: `console.${method}`,
      message,
      level,
      data: {
        arguments: this.serializeArgs(args),
      },
    });
  }

  /**
   * Map console method to breadcrumb level
   */
  private methodToLevel(method: ConsoleMethod): BreadcrumbLevel {
    switch (method) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      case 'debug':
        return 'debug';
      default:
        return 'info';
    }
  }

  /**
   * Format arguments into a string message
   */
  private formatArgs(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') {
          return arg;
        }
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ')
      .substring(0, 500); // Limit length
  }

  /**
   * Serialize arguments for data storage
   */
  private serializeArgs(args: unknown[]): unknown[] {
    return args.map((arg) => {
      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        return arg;
      }
      if (arg === null || arg === undefined) {
        return arg;
      }
      if (arg instanceof Error) {
        return {
          name: arg.name,
          message: arg.message,
        };
      }
      try {
        // Attempt to serialize, limit depth
        return JSON.parse(JSON.stringify(arg));
      } catch {
        return '[Unserializable]';
      }
    });
  }

  /**
   * Reset tracker state
   */
  reset(): void {
    this.stop();
  }
}

// Singleton instance
let consoleTracker: ConsoleTracker | null = null;

export function getConsoleTracker(): ConsoleTracker {
  if (!consoleTracker) {
    consoleTracker = new ConsoleTracker();
  }
  return consoleTracker;
}

export function resetConsoleTracker(): void {
  if (consoleTracker) {
    consoleTracker.reset();
  }
  consoleTracker = null;
}
