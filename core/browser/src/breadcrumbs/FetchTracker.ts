import type { Breadcrumb } from '../types';
import { getBreadcrumbManager } from './BreadcrumbManager';

/**
 * Track fetch() requests
 */
export class FetchTracker {
  private enabled = false;
  private originalFetch: typeof fetch | null = null;

  /**
   * Start tracking fetch requests
   */
  start(): void {
    if (this.enabled || typeof window === 'undefined' || typeof fetch === 'undefined') {
      return;
    }

    this.originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const startTime = Date.now();
      const { method, url } = this.extractRequestInfo(input, init);

      let response: Response;
      let error: Error | null = null;

      try {
        response = await this.originalFetch!(input, init);
      } catch (e) {
        error = e instanceof Error ? e : new Error(String(e));
        this.recordBreadcrumb(method, url, startTime, undefined, error);
        throw e;
      }

      this.recordBreadcrumb(method, url, startTime, response.status);

      return response;
    };

    this.enabled = true;
  }

  /**
   * Stop tracking fetch requests
   */
  stop(): void {
    if (!this.enabled || !this.originalFetch) {
      return;
    }

    window.fetch = this.originalFetch;
    this.originalFetch = null;
    this.enabled = false;
  }

  /**
   * Extract method and URL from fetch arguments
   */
  private extractRequestInfo(
    input: RequestInfo | URL,
    init?: RequestInit
  ): { method: string; url: string } {
    let method = 'GET';
    let url: string;

    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
      method = input.method;
    } else {
      url = String(input);
    }

    if (init?.method) {
      method = init.method;
    }

    return { method: method.toUpperCase(), url };
  }

  /**
   * Record a fetch breadcrumb
   */
  private recordBreadcrumb(
    method: string,
    url: string,
    startTime: number,
    statusCode?: number,
    error?: Error
  ): void {
    const manager = getBreadcrumbManager();
    if (!manager) {
      return;
    }

    const duration = Date.now() - startTime;
    const parsedUrl = parseUrl(url);

    const breadcrumb: Breadcrumb = {
      type: 'fetch',
      category: 'http',
      level: error || (statusCode && statusCode >= 400) ? 'error' : 'info',
      message: `${method} ${parsedUrl.pathname}`,
      data: {
        method,
        url: parsedUrl.full,
        status_code: statusCode,
        duration_ms: duration,
      },
    };

    if (error) {
      breadcrumb.data = {
        ...breadcrumb.data,
        error: error.message,
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
    // Handle relative URLs
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
let instance: FetchTracker | null = null;

export function getFetchTracker(): FetchTracker {
  if (!instance) {
    instance = new FetchTracker();
  }
  return instance;
}

export function resetFetchTracker(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
