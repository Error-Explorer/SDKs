/**
 * Express middleware for Error Explorer
 *
 * Usage:
 * ```typescript
 * import { ErrorExplorer } from '@error-explorer/node';
 * import { requestHandler, errorHandler } from '@error-explorer/node/express';
 *
 * const app = express();
 *
 * // Add request handler as early as possible
 * app.use(requestHandler());
 *
 * // Your routes here...
 *
 * // Add error handler as the LAST middleware
 * app.use(errorHandler());
 * ```
 */

import type {
  ExpressRequest,
  ExpressResponse,
  ExpressNextFunction,
  ExpressMiddleware,
  ExpressErrorMiddleware,
  UserContext,
} from '../types.js';
import { ErrorExplorer } from '../ErrorExplorer.js';
import { extractRequestContext } from '../context/RequestContext.js';
import { generateTransactionId } from '../utils/uuid.js';
import { getBreadcrumbManager } from '../breadcrumbs/BreadcrumbManager.js';

export interface RequestHandlerOptions {
  /**
   * Function to extract user from request
   */
  extractUser?: (req: ExpressRequest) => UserContext | null | undefined;

  /**
   * Add request breadcrumbs (default: true)
   */
  breadcrumbs?: boolean;
}

export interface ErrorHandlerOptions {
  /**
   * Whether to call next() after handling (default: true)
   */
  callNext?: boolean;

  /**
   * Custom error response function
   */
  onError?: (error: Error, req: ExpressRequest, res: ExpressResponse) => void;
}

/**
 * Request handler middleware - adds context to each request
 */
export function requestHandler(options: RequestHandlerOptions = {}): ExpressMiddleware {
  const { extractUser, breadcrumbs = true } = options;

  return (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction): void => {
    // Generate transaction ID
    const transaction = generateTransactionId();

    // Attach ErrorExplorer context to request
    req.errorExplorer = {
      transaction,
      startTime: Date.now(),
    };

    // Extract and set user if function provided
    if (extractUser) {
      try {
        const user = extractUser(req);
        if (user) {
          req.errorExplorer.user = user;
        }
      } catch {
        // Ignore user extraction errors
      }
    }

    // Add request breadcrumb
    if (breadcrumbs) {
      const manager = getBreadcrumbManager();
      if (manager) {
        manager.add({
          type: 'http',
          category: 'http.request',
          message: `${req.method} ${req.path || req.url}`,
          level: 'info',
          data: {
            method: req.method,
            url: req.originalUrl || req.url,
            transaction,
          },
        });
      }
    }

    // Track response for breadcrumb
    if (breadcrumbs) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalEnd = res.end;
      let ended = false;

      // Override res.end to capture response timing
      res.end = function (
        ...args: unknown[]
      ): ExpressResponse {
        if (!ended) {
          ended = true;

          const duration = req.errorExplorer?.startTime
            ? Date.now() - req.errorExplorer.startTime
            : undefined;

          const manager = getBreadcrumbManager();
          if (manager) {
            manager.add({
              type: 'http',
              category: 'http.response',
              message: `${req.method} ${req.path || req.url} - ${res.statusCode}`,
              level: res.statusCode >= 400 ? 'warning' : 'info',
              data: {
                method: req.method,
                url: req.originalUrl || req.url,
                status_code: res.statusCode,
                duration_ms: duration,
                transaction,
              },
            });
          }
        }

        // Call original - TypeScript doesn't handle the overloads well
        return (originalEnd as (...args: unknown[]) => ExpressResponse).apply(res, args);
      } as typeof res.end;
    }

    next();
  };
}

/**
 * Error handler middleware - captures and reports errors
 */
export function errorHandler(options: ErrorHandlerOptions = {}): ExpressErrorMiddleware {
  const { callNext = true, onError } = options;

  return (
    error: Error,
    req: ExpressRequest,
    res: ExpressResponse,
    next: ExpressNextFunction
  ): void => {
    // Skip if already sent response
    if (res.headersSent) {
      if (callNext) {
        next(error);
      }
      return;
    }

    // Extract request context
    const requestContext = extractRequestContext(req);

    // Get user from request context or ErrorExplorer context
    const user = req.errorExplorer?.user;

    // Get transaction ID
    const transaction = req.errorExplorer?.transaction;

    // Capture the error
    ErrorExplorer.captureException(error, {
      request: req,
      user,
      tags: {
        transaction: transaction || 'unknown',
        route: req.path || req.url || 'unknown',
        method: req.method || 'unknown',
      },
      extra: {
        requestContext,
        query: req.query,
        params: req.params,
      },
    });

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, req, res);
      } catch {
        // Ignore custom handler errors
      }
    }

    // Continue to next error handler
    if (callNext) {
      next(error);
    }
  };
}

/**
 * Convenience function to create both middlewares
 */
export function setupExpress(
  requestOptions: RequestHandlerOptions = {},
  errorOptions: ErrorHandlerOptions = {}
): {
  requestHandler: ExpressMiddleware;
  errorHandler: ExpressErrorMiddleware;
} {
  return {
    requestHandler: requestHandler(requestOptions),
    errorHandler: errorHandler(errorOptions),
  };
}
