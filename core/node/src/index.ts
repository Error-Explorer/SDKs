/**
 * @error-explorer/node - Error Explorer SDK for Node.js
 *
 * Usage:
 * ```typescript
 * import { ErrorExplorer } from '@error-explorer/node';
 *
 * ErrorExplorer.init({
 *   dsn: 'https://ee_xxx@error-explorer.com/api/v1/webhook',
 *   environment: 'production',
 *   release: '1.0.0',
 * });
 *
 * // Manual capture
 * try {
 *   // ... your code
 * } catch (error) {
 *   ErrorExplorer.captureException(error);
 * }
 *
 * // With Express
 * import { requestHandler, errorHandler } from '@error-explorer/node/express';
 * app.use(requestHandler());
 * app.use(errorHandler());
 * ```
 */

// Main client
export { ErrorExplorer } from './ErrorExplorer.js';

// Types
export type {
  InitOptions,
  ResolvedConfig,
  Breadcrumb,
  BreadcrumbType,
  BreadcrumbLevel,
  InternalBreadcrumb,
  UserContext,
  CaptureContext,
  SeverityLevel,
  StackFrame,
  ErrorEvent,
  RequestContext,
  ServerContext,
  RuntimeContext,
  OsContext,
  ProcessContext,
  SdkInfo,
  TransportOptions,
  QueuedEvent,
  ExpressRequest,
  ExpressResponse,
  ExpressNextFunction,
  ExpressMiddleware,
  ExpressErrorMiddleware,
} from './types.js';

// Express middleware (also exported from ./express)
export { requestHandler, errorHandler, setupExpress } from './middleware/express.js';
export type { RequestHandlerOptions, ErrorHandlerOptions } from './middleware/express.js';

// HTTP middleware (also exported from ./http)
export { wrapHandler, createTrackedServer } from './middleware/http.js';
export type { HttpHandlerOptions } from './middleware/http.js';

// Breadcrumb utilities
export { getBreadcrumbManager } from './breadcrumbs/BreadcrumbManager.js';

// Context utilities
export { collectProcessContext } from './context/ProcessContext.js';
export { collectOsContext } from './context/OsContext.js';
export { collectRuntimeContext } from './context/RuntimeContext.js';
export { getServerContext, setServerName } from './context/ServerContext.js';
export { extractRequestContext } from './context/RequestContext.js';

// Utils
export { parseStackTrace } from './utils/stacktrace.js';
export { generateUuid, generateShortId, generateTransactionId } from './utils/uuid.js';

// Security
export { HmacSigner } from './security/HmacSigner.js';

// Re-export ErrorExplorer as default
import { ErrorExplorer as EE } from './ErrorExplorer.js';
export default EE;
