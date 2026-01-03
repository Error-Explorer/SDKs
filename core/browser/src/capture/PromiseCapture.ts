import type { CapturedError, ErrorHandler } from './ErrorCapture';
import { getErrorName, getErrorMessage, getErrorStack } from '../utils/stacktrace';

/**
 * Captures unhandled promise rejections
 */
export class PromiseCapture {
  private enabled = false;
  private handler: ErrorHandler | null = null;
  private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  /**
   * Start capturing unhandled rejections
   */
  start(handler: ErrorHandler): void {
    if (this.enabled || typeof window === 'undefined') {
      return;
    }

    this.handler = handler;

    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      this.handleRejection(event);
    };

    window.addEventListener('unhandledrejection', this.rejectionHandler);

    this.enabled = true;
  }

  /**
   * Stop capturing unhandled rejections
   */
  stop(): void {
    if (!this.enabled || !this.rejectionHandler) {
      return;
    }

    window.removeEventListener('unhandledrejection', this.rejectionHandler);
    this.rejectionHandler = null;
    this.handler = null;
    this.enabled = false;
  }

  /**
   * Handle an unhandled rejection event
   */
  private handleRejection(event: PromiseRejectionEvent): void {
    if (!this.handler) {
      return;
    }

    const reason = event.reason;

    const captured: CapturedError = {
      message: this.extractMessage(reason),
      name: this.extractName(reason),
      stack: this.extractStack(reason),
      severity: 'error',
      originalError: reason instanceof Error ? reason : undefined,
    };

    this.handler(captured);
  }

  /**
   * Extract error message from rejection reason
   */
  private extractMessage(reason: unknown): string {
    if (reason instanceof Error) {
      return getErrorMessage(reason);
    }

    if (typeof reason === 'string') {
      return reason;
    }

    if (reason === undefined) {
      return 'Promise rejected with undefined';
    }

    if (reason === null) {
      return 'Promise rejected with null';
    }

    // Try to get message property
    if (typeof reason === 'object' && reason !== null) {
      const obj = reason as Record<string, unknown>;
      if (typeof obj['message'] === 'string') {
        return obj['message'];
      }
    }

    try {
      return `Promise rejected with: ${JSON.stringify(reason)}`;
    } catch {
      return 'Promise rejected with non-serializable value';
    }
  }

  /**
   * Extract error name from rejection reason
   */
  private extractName(reason: unknown): string {
    if (reason instanceof Error) {
      return getErrorName(reason);
    }

    if (typeof reason === 'object' && reason !== null) {
      const obj = reason as Record<string, unknown>;
      if (typeof obj['name'] === 'string') {
        return obj['name'];
      }
    }

    return 'UnhandledRejection';
  }

  /**
   * Extract stack trace from rejection reason
   */
  private extractStack(reason: unknown): string | undefined {
    if (reason instanceof Error) {
      return getErrorStack(reason);
    }

    if (typeof reason === 'object' && reason !== null) {
      const obj = reason as Record<string, unknown>;
      if (typeof obj['stack'] === 'string') {
        return obj['stack'];
      }
    }

    return undefined;
  }
}

// Singleton instance
let instance: PromiseCapture | null = null;

export function getPromiseCapture(): PromiseCapture {
  if (!instance) {
    instance = new PromiseCapture();
  }
  return instance;
}

export function resetPromiseCapture(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
