import type { Breadcrumb } from '../types';
import { getBreadcrumbManager } from './BreadcrumbManager';

interface XHRInfo {
  method: string;
  url: string;
  startTime: number;
}

/**
 * Track XMLHttpRequest requests
 */
export class XHRTracker {
  private enabled = false;
  private originalOpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalSend: typeof XMLHttpRequest.prototype.send | null = null;
  private xhrInfoMap = new WeakMap<XMLHttpRequest, XHRInfo>();

  /**
   * Start tracking XHR requests
   */
  start(): void {
    if (this.enabled || typeof XMLHttpRequest === 'undefined') {
      return;
    }

    const self = this;

    // Wrap open() to capture method and URL
    this.originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ) {
      self.xhrInfoMap.set(this, {
        method: method.toUpperCase(),
        url: url.toString(),
        startTime: 0,
      });

      return self.originalOpen!.call(this, method, url, async, username, password);
    };

    // Wrap send() to capture timing and response
    this.originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const info = self.xhrInfoMap.get(this);
      if (info) {
        info.startTime = Date.now();
      }

      // Listen for completion
      this.addEventListener('loadend', () => {
        self.recordBreadcrumb(this);
      });

      return self.originalSend!.call(this, body);
    };

    this.enabled = true;
  }

  /**
   * Stop tracking XHR requests
   */
  stop(): void {
    if (!this.enabled) {
      return;
    }

    if (this.originalOpen) {
      XMLHttpRequest.prototype.open = this.originalOpen;
      this.originalOpen = null;
    }

    if (this.originalSend) {
      XMLHttpRequest.prototype.send = this.originalSend;
      this.originalSend = null;
    }

    this.enabled = false;
  }

  /**
   * Record an XHR breadcrumb
   */
  private recordBreadcrumb(xhr: XMLHttpRequest): void {
    const manager = getBreadcrumbManager();
    if (!manager) {
      return;
    }

    const info = this.xhrInfoMap.get(xhr);
    if (!info) {
      return;
    }

    const duration = info.startTime > 0 ? Date.now() - info.startTime : 0;
    const parsedUrl = parseUrl(info.url);
    const statusCode = xhr.status;
    const isError = statusCode === 0 || statusCode >= 400;

    const breadcrumb: Breadcrumb = {
      type: 'xhr',
      category: 'http',
      level: isError ? 'error' : 'info',
      message: `${info.method} ${parsedUrl.pathname}`,
      data: {
        method: info.method,
        url: parsedUrl.full,
        status_code: statusCode || undefined,
        duration_ms: duration,
      },
    };

    // Add error info if request failed
    if (statusCode === 0) {
      breadcrumb.data = {
        ...breadcrumb.data,
        error: 'Request failed (network error or CORS)',
      };
    }

    manager.add(breadcrumb);
  }
}

/**
 * Parse URL and extract components
 */
function parseUrl(url: string): { full: string; pathname: string } {
  try {
    const parsed = new URL(url, window.location.origin);
    return {
      full: parsed.href,
      pathname: parsed.pathname,
    };
  } catch {
    return { full: url, pathname: url };
  }
}

// Singleton instance
let instance: XHRTracker | null = null;

export function getXHRTracker(): XHRTracker {
  if (!instance) {
    instance = new XHRTracker();
  }
  return instance;
}

export function resetXHRTracker(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
