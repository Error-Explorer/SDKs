import type { BrowserContext } from '../types';

/**
 * Collect browser context information
 */
export function collectBrowserContext(): BrowserContext {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {};
  }

  const context: BrowserContext = {
    user_agent: navigator.userAgent,
    language: navigator.language,
    online: navigator.onLine,
  };

  // Parse user agent for browser name/version
  const browserInfo = parseBrowserInfo(navigator.userAgent);
  if (browserInfo) {
    context.name = browserInfo.name;
    context.version = browserInfo.version;
  }

  // Viewport size
  context.viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Memory info (Chrome only)
  if ('memory' in performance) {
    const memory = (performance as unknown as { memory: MemoryInfo }).memory;
    if (memory) {
      context.memory = {
        used_js_heap_size: memory.usedJSHeapSize,
        total_js_heap_size: memory.totalJSHeapSize,
        js_heap_size_limit: memory.jsHeapSizeLimit,
      };
    }
  }

  return context;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface BrowserInfo {
  name: string;
  version: string;
}

/**
 * Parse browser info from user agent string
 */
function parseBrowserInfo(userAgent: string): BrowserInfo | null {
  // Order matters - check more specific patterns first
  const browsers: Array<{ name: string; pattern: RegExp }> = [
    { name: 'Edge', pattern: /Edg(?:e|A|iOS)?\/(\d+(?:\.\d+)*)/ },
    { name: 'Opera', pattern: /(?:OPR|Opera)\/(\d+(?:\.\d+)*)/ },
    { name: 'Chrome', pattern: /Chrome\/(\d+(?:\.\d+)*)/ },
    { name: 'Safari', pattern: /Version\/(\d+(?:\.\d+)*).*Safari/ },
    { name: 'Firefox', pattern: /Firefox\/(\d+(?:\.\d+)*)/ },
    { name: 'IE', pattern: /(?:MSIE |rv:)(\d+(?:\.\d+)*)/ },
  ];

  for (const browser of browsers) {
    const match = userAgent.match(browser.pattern);
    if (match?.[1]) {
      return {
        name: browser.name,
        version: match[1],
      };
    }
  }

  return null;
}
