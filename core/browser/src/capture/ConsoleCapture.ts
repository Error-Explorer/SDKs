import type { CapturedError, ErrorHandler } from './ErrorCapture';
import { getErrorName, getErrorMessage, getErrorStack } from '../utils/stacktrace';

/**
 * Captures console.error calls as errors (not just breadcrumbs)
 */
export class ConsoleCapture {
  private enabled = false;
  private handler: ErrorHandler | null = null;
  private originalConsoleError: typeof console.error | null = null;

  /**
   * Start capturing console.error
   */
  start(handler: ErrorHandler): void {
    if (this.enabled || typeof console === 'undefined') {
      return;
    }

    this.handler = handler;
    this.originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      // Always call original first
      this.originalConsoleError!.apply(console, args);

      // Then capture as error
      this.handleConsoleError(args);
    };

    this.enabled = true;
  }

  /**
   * Stop capturing console.error
   */
  stop(): void {
    if (!this.enabled || !this.originalConsoleError) {
      return;
    }

    console.error = this.originalConsoleError;
    this.originalConsoleError = null;
    this.handler = null;
    this.enabled = false;
  }

  /**
   * Handle a console.error call
   */
  private handleConsoleError(args: unknown[]): void {
    if (!this.handler || args.length === 0) {
      return;
    }

    // Check if first argument is an Error
    const firstArg = args[0];
    let captured: CapturedError;

    if (firstArg instanceof Error) {
      captured = {
        message: getErrorMessage(firstArg),
        name: getErrorName(firstArg),
        stack: getErrorStack(firstArg),
        severity: 'error',
        originalError: firstArg,
      };
    } else {
      // Treat as a message
      const message = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');

      captured = {
        message,
        name: 'ConsoleError',
        severity: 'error',
      };

      // Try to find an Error in the args for stack trace
      for (const arg of args) {
        if (arg instanceof Error) {
          captured.stack = getErrorStack(arg);
          captured.originalError = arg;
          break;
        }
      }
    }

    this.handler(captured);
  }
}

// Singleton instance
let instance: ConsoleCapture | null = null;

export function getConsoleCapture(): ConsoleCapture {
  if (!instance) {
    instance = new ConsoleCapture();
  }
  return instance;
}

export function resetConsoleCapture(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
