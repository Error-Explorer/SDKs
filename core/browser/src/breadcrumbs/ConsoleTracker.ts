import type { Breadcrumb, BreadcrumbLevel } from '../types';
import { getBreadcrumbManager } from './BreadcrumbManager';
import { safeSerialize, truncateString } from '../utils/serialize';

type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

const LEVEL_MAP: Record<ConsoleLevel, BreadcrumbLevel> = {
  log: 'info',
  info: 'info',
  warn: 'warning',
  error: 'error',
  debug: 'debug',
};

/**
 * Track console.log/info/warn/error/debug calls
 */
export class ConsoleTracker {
  private enabled = false;
  private originalMethods: Partial<Record<ConsoleLevel, typeof console.log>> = {};

  /**
   * Start tracking console calls
   */
  start(): void {
    if (this.enabled || typeof console === 'undefined') {
      return;
    }

    const levels: ConsoleLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

    for (const level of levels) {
      this.wrapConsoleMethod(level);
    }

    this.enabled = true;
  }

  /**
   * Stop tracking console calls
   */
  stop(): void {
    if (!this.enabled) {
      return;
    }

    // Restore original methods
    for (const [level, original] of Object.entries(this.originalMethods)) {
      if (original) {
        (console as unknown as Record<string, unknown>)[level] = original;
      }
    }

    this.originalMethods = {};
    this.enabled = false;
  }

  /**
   * Wrap a console method
   */
  private wrapConsoleMethod(level: ConsoleLevel): void {
    const original = console[level];
    if (!original) {
      return;
    }

    this.originalMethods[level] = original;

    console[level] = (...args: unknown[]) => {
      // Always call original first
      original.apply(console, args);

      // Then record breadcrumb
      this.recordBreadcrumb(level, args);
    };
  }

  /**
   * Record a console breadcrumb
   */
  private recordBreadcrumb(level: ConsoleLevel, args: unknown[]): void {
    const manager = getBreadcrumbManager();
    if (!manager) {
      return;
    }

    // Format message
    const message = this.formatMessage(args);

    const breadcrumb: Breadcrumb = {
      type: 'console',
      category: 'console',
      level: LEVEL_MAP[level],
      message: truncateString(message, 200),
      data: {
        level,
        arguments: args.length > 1 ? args.map((arg) => safeSerialize(arg)) : undefined,
      },
    };

    manager.add(breadcrumb);
  }

  /**
   * Format console arguments into a message string
   */
  private formatMessage(args: unknown[]): string {
    if (args.length === 0) {
      return '';
    }

    return args
      .map((arg) => {
        if (typeof arg === 'string') {
          return arg;
        }
        if (arg instanceof Error) {
          return `${arg.name}: ${arg.message}`;
        }
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }
}

// Singleton instance
let instance: ConsoleTracker | null = null;

export function getConsoleTracker(): ConsoleTracker {
  if (!instance) {
    instance = new ConsoleTracker();
  }
  return instance;
}

export function resetConsoleTracker(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
