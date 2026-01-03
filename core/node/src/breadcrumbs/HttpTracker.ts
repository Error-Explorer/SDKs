/**
 * HTTP breadcrumb tracker
 * Tracks outgoing HTTP requests (http.request, https.request)
 *
 * Note: In some environments (like test runners), we cannot patch http modules.
 * The tracker gracefully handles this case.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import { getBreadcrumbManager } from './BreadcrumbManager.js';

type HttpModule = typeof http | typeof https;
type RequestOptions = http.RequestOptions | string | URL;

class HttpTracker {
  private originalHttpRequest: typeof http.request | null = null;
  private originalHttpsRequest: typeof https.request | null = null;
  private started = false;
  private patchFailed = false;

  /**
   * Start tracking HTTP requests
   */
  start(): void {
    if (this.started || this.patchFailed) {
      return;
    }

    try {
      // Store originals
      this.originalHttpRequest = http.request;
      this.originalHttpsRequest = https.request;

      // Wrap http.request
      this.wrapRequestMethod(http, 'http');

      // Wrap https.request
      this.wrapRequestMethod(https, 'https');

      this.started = true;
    } catch {
      // In some environments (like test runners), patching fails
      // This is not critical, just disable HTTP tracking
      this.patchFailed = true;
      this.originalHttpRequest = null;
      this.originalHttpsRequest = null;
    }
  }

  /**
   * Stop tracking HTTP requests
   */
  stop(): void {
    if (!this.started) {
      return;
    }

    try {
      // Restore originals
      if (this.originalHttpRequest) {
        Object.defineProperty(http, 'request', {
          value: this.originalHttpRequest,
          writable: true,
          configurable: true,
        });
      }
      if (this.originalHttpsRequest) {
        Object.defineProperty(https, 'request', {
          value: this.originalHttpsRequest,
          writable: true,
          configurable: true,
        });
      }
    } catch {
      // Ignore restore failures
    }

    this.originalHttpRequest = null;
    this.originalHttpsRequest = null;
    this.started = false;
  }

  /**
   * Wrap a module's request method
   */
  private wrapRequestMethod(mod: HttpModule, _protocol: 'http' | 'https'): void {
    const originalRequest = mod.request.bind(mod);
    const self = this;

    const wrappedRequest = function (
      ...args: Parameters<typeof http.request>
    ): http.ClientRequest {
      const [urlOrOptions, optionsOrCallback, maybeCallback] = args;

      // Parse URL and options
      const { url, method, hostname } = self.parseRequestArgs(
        urlOrOptions,
        optionsOrCallback
      );

      const startTime = Date.now();

      // Call original
      const req = originalRequest.apply(mod, args);

      // Track response
      req.on('response', (res) => {
        const duration = Date.now() - startTime;
        self.addBreadcrumb(method, url, hostname, res.statusCode, duration);
      });

      // Track errors
      req.on('error', (error) => {
        const duration = Date.now() - startTime;
        self.addErrorBreadcrumb(method, url, hostname, error, duration);
      });

      return req;
    };

    // Use Object.defineProperty to avoid strict mode issues
    Object.defineProperty(mod, 'request', {
      value: wrappedRequest,
      writable: true,
      configurable: true,
    });
  }

  /**
   * Parse request arguments to extract URL info
   */
  private parseRequestArgs(
    urlOrOptions: RequestOptions,
    optionsOrCallback?: http.RequestOptions | ((res: http.IncomingMessage) => void)
  ): { url: string; method: string; hostname: string } {
    let url = '';
    let method = 'GET';
    let hostname = '';

    if (typeof urlOrOptions === 'string') {
      url = urlOrOptions;
      try {
        const parsed = new URL(urlOrOptions);
        hostname = parsed.hostname;
      } catch {
        hostname = urlOrOptions;
      }
    } else if (urlOrOptions instanceof URL) {
      url = urlOrOptions.toString();
      hostname = urlOrOptions.hostname;
    } else if (typeof urlOrOptions === 'object') {
      const opts = urlOrOptions;
      hostname = opts.hostname || opts.host || 'localhost';
      const port = opts.port ? `:${opts.port}` : '';
      const path = opts.path || '/';
      const protocol = opts.protocol || 'http:';
      url = `${protocol}//${hostname}${port}${path}`;
      method = opts.method || 'GET';
    }

    // Check if second arg is options (not callback)
    if (
      optionsOrCallback &&
      typeof optionsOrCallback === 'object' &&
      optionsOrCallback.method
    ) {
      method = optionsOrCallback.method;
    }

    return { url, method: method.toUpperCase(), hostname };
  }

  /**
   * Add a breadcrumb for a successful HTTP request
   */
  private addBreadcrumb(
    method: string,
    url: string,
    hostname: string,
    statusCode: number | undefined,
    duration: number
  ): void {
    const manager = getBreadcrumbManager();
    if (!manager) {
      return;
    }

    manager.add({
      type: 'http',
      category: 'http.client',
      message: `${method} ${url}`,
      level: statusCode && statusCode >= 400 ? 'warning' : 'info',
      data: {
        method,
        url: this.truncateUrl(url),
        hostname,
        status_code: statusCode,
        duration_ms: duration,
      },
    });
  }

  /**
   * Add a breadcrumb for a failed HTTP request
   */
  private addErrorBreadcrumb(
    method: string,
    url: string,
    hostname: string,
    error: Error,
    duration: number
  ): void {
    const manager = getBreadcrumbManager();
    if (!manager) {
      return;
    }

    manager.add({
      type: 'http',
      category: 'http.client',
      message: `${method} ${url} failed: ${error.message}`,
      level: 'error',
      data: {
        method,
        url: this.truncateUrl(url),
        hostname,
        error: error.message,
        duration_ms: duration,
      },
    });
  }

  /**
   * Truncate URL for storage
   */
  private truncateUrl(url: string): string {
    const maxLength = 200;
    if (url.length <= maxLength) {
      return url;
    }
    return url.substring(0, maxLength) + '...';
  }

  /**
   * Reset tracker state
   */
  reset(): void {
    this.stop();
    this.patchFailed = false;
  }
}

// Singleton instance
let httpTracker: HttpTracker | null = null;

export function getHttpTracker(): HttpTracker {
  if (!httpTracker) {
    httpTracker = new HttpTracker();
  }
  return httpTracker;
}

export function resetHttpTracker(): void {
  if (httpTracker) {
    httpTracker.reset();
  }
  httpTracker = null;
}
