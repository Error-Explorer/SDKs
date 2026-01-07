/**
 * Console error capture
 * Captures console.error calls as errors (optional)
 */

import type { CapturedError } from './ProcessCapture.js';

type CaptureHandler = (captured: CapturedError) => void;

class ConsoleCapture {
  private handler: CaptureHandler | null = null;
  private originalConsoleError: typeof console.error | null = null;
  private started = false;

  /**
   * Start capturing console.error calls
   */
  start(handler: CaptureHandler): void {
    if (this.started) {
      return;
    }

    this.handler = handler;
    this.originalConsoleError = console.error.bind(console);

    const self = this;
    console.error = function (...args: unknown[]): void {
      // Call original first
      self.originalConsoleError!(...args);

      // Then capture
      self.handleConsoleError(args);
    };

    this.started = true;
  }

  /**
   * Stop capturing console.error
   */
  stop(): void {
    if (!this.started || !this.originalConsoleError) {
      return;
    }

    console.error = this.originalConsoleError;
    this.originalConsoleError = null;
    this.handler = null;
    this.started = false;
  }

  /**
   * Handle console.error call
   */
  private handleConsoleError(args: unknown[]): void {
    if (!this.handler) {
      return;
    }

    // Extract error or create one from arguments
    let error: Error;
    let message: string;

    const firstArg = args[0];
    if (firstArg instanceof Error) {
      error = firstArg;
      message = error.message;
    } else {
      message = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');
      error = new Error(message);
    }

    const captured: CapturedError = {
      error,
      message,
      type: 'console',
      severity: 'error',
    };

    try {
      this.handler(captured);
    } catch {
      // Ignore handler errors
    }
  }

  /**
   * Reset capture state
   */
  reset(): void {
    this.stop();
  }
}

// Singleton instance
let consoleCapture: ConsoleCapture | null = null;

export function getConsoleCapture(): ConsoleCapture {
  if (!consoleCapture) {
    consoleCapture = new ConsoleCapture();
  }
  return consoleCapture;
}

export function resetConsoleCapture(): void {
  if (consoleCapture) {
    consoleCapture.reset();
  }
  consoleCapture = null;
}
