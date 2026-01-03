import type { RequestContext } from '../types';

/**
 * Collect current request/page context
 */
export function collectRequestContext(): RequestContext {
  if (typeof window === 'undefined') {
    return {};
  }

  const location = window.location;

  return {
    url: location.href,
    method: 'GET', // Browser is always GET for page loads
    query_string: location.search ? location.search.substring(1) : undefined,
  };
}

/**
 * Get the current page URL
 */
export function getCurrentUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.href;
}

/**
 * Get the current page pathname
 */
export function getCurrentPathname(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.pathname;
}

/**
 * Get the referrer URL
 */
export function getReferrer(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  return document.referrer || undefined;
}
