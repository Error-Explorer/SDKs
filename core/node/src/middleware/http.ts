/**
 * HTTP middleware for Error Explorer (framework-agnostic)
 *
 * For use with Node.js built-in http module or compatible frameworks
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { UserContext } from '../types.js';
import { ErrorExplorer } from '../ErrorExplorer.js';
import { extractRequestContext } from '../context/RequestContext.js';
import { generateTransactionId } from '../utils/uuid.js';
import { getBreadcrumbManager } from '../breadcrumbs/BreadcrumbManager.js';

export interface HttpHandlerOptions {
  /**
   * Function to extract user from request
   */
  extractUser?: (req: IncomingMessage) => UserContext | null | undefined;

  /**
   * Add request breadcrumbs (default: true)
   */
  breadcrumbs?: boolean;
}

/**
 * Wrap an HTTP request handler to add error tracking
 */
export function wrapHandler(
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>,
  options: HttpHandlerOptions = {}
): (req: IncomingMessage, res: ServerResponse) => void {
  const { extractUser, breadcrumbs = true } = options;

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const transaction = generateTransactionId();
    const startTime = Date.now();

    // Add request breadcrumb
    if (breadcrumbs) {
      const manager = getBreadcrumbManager();
      if (manager) {
        manager.add({
          type: 'http',
          category: 'http.request',
          message: `${req.method} ${req.url}`,
          level: 'info',
          data: {
            method: req.method,
            url: req.url,
            transaction,
          },
        });
      }
    }

    // Extract user
    let user: UserContext | null | undefined;
    if (extractUser) {
      try {
        user = extractUser(req);
      } catch {
        // Ignore
      }
    }

    try {
      await handler(req, res);
    } catch (error) {
      // Capture the error
      ErrorExplorer.captureException(error, {
        request: req,
        user: user || undefined,
        tags: {
          transaction,
          method: req.method || 'unknown',
        },
        extra: {
          requestContext: extractRequestContext(req),
        },
      });

      // Re-throw to let the caller handle response
      throw error;
    } finally {
      // Add response breadcrumb
      if (breadcrumbs) {
        const duration = Date.now() - startTime;
        const manager = getBreadcrumbManager();
        if (manager) {
          manager.add({
            type: 'http',
            category: 'http.response',
            message: `${req.method} ${req.url} - ${res.statusCode}`,
            level: res.statusCode >= 400 ? 'warning' : 'info',
            data: {
              method: req.method,
              url: req.url,
              status_code: res.statusCode,
              duration_ms: duration,
              transaction,
            },
          });
        }
      }
    }
  };
}

/**
 * Create a simple HTTP server with error tracking
 */
export function createTrackedServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>,
  options: HttpHandlerOptions = {}
): (req: IncomingMessage, res: ServerResponse) => void {
  return wrapHandler(handler, options);
}
