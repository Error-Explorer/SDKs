/**
 * @error-explorer/browser
 * Error Explorer SDK for Browser - Automatic error tracking and breadcrumbs
 */

// Main export
export { ErrorExplorer } from './ErrorExplorer';

// Types
export type {
  InitOptions,
  UserContext,
  Breadcrumb,
  BreadcrumbType,
  BreadcrumbLevel,
  CaptureContext,
  SeverityLevel,
  ErrorEvent,
  StackFrame,
  BrowserContext,
  SessionContext,
  RequestContext,
} from './types';

// Default export for convenience
import { ErrorExplorer } from './ErrorExplorer';
export default ErrorExplorer;
