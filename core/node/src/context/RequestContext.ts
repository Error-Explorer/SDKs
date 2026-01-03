/**
 * Request context extractor
 */

import type { IncomingMessage } from 'node:http';
import type { RequestContext, ExpressRequest } from '../types.js';

/**
 * Extract request context from Node.js IncomingMessage or Express request
 */
export function extractRequestContext(
  req: IncomingMessage | ExpressRequest
): RequestContext {
  const headers: Record<string, string | string[] | undefined> = {};

  // Copy headers, filtering out sensitive ones
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  for (const [key, value] of Object.entries(req.headers)) {
    const lowerKey = key.toLowerCase();
    if (!sensitiveHeaders.includes(lowerKey)) {
      headers[key] = value;
    } else {
      headers[key] = '[Filtered]';
    }
  }

  const context: RequestContext = {
    method: req.method,
    headers,
    url: getFullUrl(req),
  };

  // Add query string
  const url = req.url || '';
  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    context.query_string = url.substring(queryIndex + 1);
  }

  // Express-specific data
  const expressReq = req as ExpressRequest;
  if (expressReq.body !== undefined) {
    context.data = sanitizeBody(expressReq.body);
  }

  // Add cookies if available (from cookie-parser middleware)
  if (expressReq.cookies) {
    context.cookies = sanitizeCookies(expressReq.cookies);
  }

  return context;
}

/**
 * Get full URL from request
 */
function getFullUrl(req: IncomingMessage | ExpressRequest): string {
  const expressReq = req as ExpressRequest;

  // Use originalUrl if available (Express)
  const path = expressReq.originalUrl || req.url || '/';

  // Try to construct full URL
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = req.headers.host || 'localhost';

  return `${protocol}://${host}${path}`;
}

/**
 * Sanitize request body (remove sensitive fields)
 */
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveKeys = ['password', 'secret', 'token', 'api_key', 'apiKey', 'credit_card', 'creditCard', 'cvv', 'ssn'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = '[Filtered]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize cookies (remove sensitive ones)
 */
function sanitizeCookies(cookies: Record<string, string>): Record<string, string> {
  const sensitiveNames = ['session', 'sess', 'token', 'auth', 'jwt', 'sid'];
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(cookies)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveNames.some((sn) => lowerKey.includes(sn))) {
      sanitized[key] = '[Filtered]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
