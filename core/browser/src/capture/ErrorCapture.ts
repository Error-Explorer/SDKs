import type { SeverityLevel } from '../types';
import { getErrorName, getErrorMessage, getErrorStack } from '../utils/stacktrace';

export interface CapturedError {
  message: string;
  name: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  severity: SeverityLevel;
  originalError?: Error;
}

export type ErrorHandler = (error: CapturedError) => void;

/**
 * Captures window.onerror errors
 */
export class ErrorCapture {
  private enabled = false;
  private handler: ErrorHandler | null = null;
  private originalOnError: OnErrorEventHandler = null;

  /**
   * Start capturing errors
   */
  start(handler: ErrorHandler): void {
    if (this.enabled || typeof window === 'undefined') {
      return;
    }

    this.handler = handler;
    this.originalOnError = window.onerror;

    window.onerror = (
      message: string | Event,
      filename?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      // Call original handler first
      if (this.originalOnError) {
        this.originalOnError.call(window, message, filename, lineno, colno, error);
      }

      this.handleError(message, filename, lineno, colno, error);

      // Don't prevent default handling
      return false;
    };

    this.enabled = true;
  }

  /**
   * Stop capturing errors
   */
  stop(): void {
    if (!this.enabled) {
      return;
    }

    window.onerror = this.originalOnError;
    this.originalOnError = null;
    this.handler = null;
    this.enabled = false;
  }

  /**
   * Handle an error event
   */
  private handleError(
    message: string | Event,
    filename?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): void {
    if (!this.handler) {
      return;
    }

    const captured: CapturedError = {
      message: this.extractMessage(message, error),
      name: error ? getErrorName(error) : 'Error',
      stack: error ? getErrorStack(error) : undefined,
      filename,
      lineno,
      colno,
      severity: 'error',
      originalError: error,
    };

    this.handler(captured);
  }

  /**
   * Extract error message from various sources
   */
  private extractMessage(message: string | Event, error?: Error): string {
    // If we have an Error object, prefer its message
    if (error) {
      return getErrorMessage(error);
    }

    // If message is a string, use it
    if (typeof message === 'string') {
      return message;
    }

    // If message is an Event, try to extract useful info
    if (message instanceof ErrorEvent) {
      return message.message || 'Unknown error';
    }

    return 'Unknown error';
  }
}

// Singleton instance
let instance: ErrorCapture | null = null;

export function getErrorCapture(): ErrorCapture {
  if (!instance) {
    instance = new ErrorCapture();
  }
  return instance;
}

export function resetErrorCapture(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
