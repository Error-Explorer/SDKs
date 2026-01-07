/**
 * Process-level error capture
 * Handles uncaughtException and unhandledRejection
 */

export interface CapturedError {
  error: Error;
  message: string;
  type: 'uncaughtException' | 'unhandledRejection' | 'console';
  severity: 'critical' | 'error';
  promise?: Promise<unknown>;
}

type CaptureHandler = (captured: CapturedError) => void;

class ProcessCapture {
  private handler: CaptureHandler | null = null;
  private uncaughtHandler: ((error: Error) => void) | null = null;
  private rejectionHandler: ((reason: unknown, promise: Promise<unknown>) => void) | null = null;
  private started = false;
  private exitOnUncaught = true;

  /**
   * Start capturing process errors
   */
  start(handler: CaptureHandler, exitOnUncaught = true): void {
    if (this.started) {
      return;
    }

    this.handler = handler;
    this.exitOnUncaught = exitOnUncaught;

    // Create bound handlers
    this.uncaughtHandler = this.handleUncaughtException.bind(this);
    this.rejectionHandler = this.handleUnhandledRejection.bind(this);

    // Register handlers
    process.on('uncaughtException', this.uncaughtHandler);
    process.on('unhandledRejection', this.rejectionHandler);

    this.started = true;
  }

  /**
   * Start only uncaughtException capture
   */
  startUncaughtException(handler: CaptureHandler, exitOnUncaught = true): void {
    if (this.uncaughtHandler) {
      return;
    }

    this.handler = handler;
    this.exitOnUncaught = exitOnUncaught;
    this.uncaughtHandler = this.handleUncaughtException.bind(this);
    process.on('uncaughtException', this.uncaughtHandler);
  }

  /**
   * Start only unhandledRejection capture
   */
  startUnhandledRejection(handler: CaptureHandler): void {
    if (this.rejectionHandler) {
      return;
    }

    this.handler = handler;
    this.rejectionHandler = this.handleUnhandledRejection.bind(this);
    process.on('unhandledRejection', this.rejectionHandler);
  }

  /**
   * Stop capturing process errors
   */
  stop(): void {
    if (this.uncaughtHandler) {
      process.off('uncaughtException', this.uncaughtHandler);
      this.uncaughtHandler = null;
    }

    if (this.rejectionHandler) {
      process.off('unhandledRejection', this.rejectionHandler);
      this.rejectionHandler = null;
    }

    this.handler = null;
    this.started = false;
  }

  /**
   * Handle uncaught exception
   */
  private handleUncaughtException(error: Error): void {
    if (!this.handler) {
      return;
    }

    const captured: CapturedError = {
      error,
      message: error.message,
      type: 'uncaughtException',
      severity: 'critical',
    };

    // Call handler synchronously
    try {
      this.handler(captured);
    } catch {
      // Ignore errors in handler to avoid infinite loop
    }

    // Exit process if configured (recommended for uncaughtException)
    if (this.exitOnUncaught) {
      // Allow time for async operations to complete
      setTimeout(() => {
        process.exit(1);
      }, 100);
    }
  }

  /**
   * Handle unhandled rejection
   */
  private handleUnhandledRejection(reason: unknown, promise: Promise<unknown>): void {
    if (!this.handler) {
      return;
    }

    // Convert reason to Error
    const error = reason instanceof Error ? reason : new Error(String(reason));

    const captured: CapturedError = {
      error,
      message: error.message,
      type: 'unhandledRejection',
      severity: 'error',
      promise,
    };

    try {
      this.handler(captured);
    } catch {
      // Ignore errors in handler
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
let processCapture: ProcessCapture | null = null;

export function getProcessCapture(): ProcessCapture {
  if (!processCapture) {
    processCapture = new ProcessCapture();
  }
  return processCapture;
}

export function resetProcessCapture(): void {
  if (processCapture) {
    processCapture.reset();
  }
  processCapture = null;
}
