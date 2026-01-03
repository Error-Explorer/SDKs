/**
 * @error-explorer/vue
 * Error Explorer SDK for Vue.js 3 - Automatic error tracking with Vue integration
 */

// Plugin
export { createErrorExplorerPlugin, restoreHandlers } from './plugin';

// Router Integration
export {
  setupRouterIntegration,
  createRouterIntegration,
  type RouterIntegrationOptions,
} from './router';

// Components
export { ErrorBoundary, withErrorBoundary, type ErrorBoundaryInstance } from './ErrorBoundary';

// Composables
export {
  useErrorExplorer,
  useComponentBreadcrumbs,
  useActionTracker,
  useErrorHandler,
  useUserContext,
  ErrorExplorerKey,
} from './composables';

// Types
export type {
  VueErrorExplorerOptions,
  VueComponentContext,
  VuePluginInstall,
  ErrorBoundaryProps,
  ErrorBoundaryExposed,
  InitOptions,
  UserContext,
  Breadcrumb,
  CaptureContext,
} from './types';

// Re-export ErrorExplorer for direct access
export { ErrorExplorer } from '@error-explorer/browser';

// Default export is the plugin creator for convenience
import { createErrorExplorerPlugin } from './plugin';
export default createErrorExplorerPlugin;
