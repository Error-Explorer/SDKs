/**
 * @error-explorer/react
 * Error Explorer SDK for React - Automatic error tracking with React integration
 */

// Import for default export
import { ErrorExplorerProvider as Provider } from './context';

// Provider and initialization
export { ErrorExplorerProvider, ErrorExplorerContext, initErrorExplorer } from './context';

// Error Boundary
export { ErrorBoundary, withErrorBoundary, useErrorBoundary } from './ErrorBoundary';

// Hooks
export {
  useErrorExplorer,
  useErrorHandler,
  useUserContext,
  useActionTracker,
  useComponentBreadcrumbs,
} from './hooks';

// Types
export type {
  ReactErrorExplorerOptions,
  ReactComponentContext,
  ErrorBoundaryProps,
  ErrorBoundaryState,
  FallbackProps,
  ErrorExplorerProviderProps,
  ErrorExplorerContextValue,
  WithErrorBoundaryOptions,
  InitOptions,
  UserContext,
  Breadcrumb,
  CaptureContext,
} from './types';

// Re-export ErrorExplorer for direct access
export { ErrorExplorer } from '@error-explorer/browser';

// Default export is the provider for convenience
export default Provider;
