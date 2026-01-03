/**
 * Browser entry point - exports singleton directly for UMD/IIFE
 */
import { ErrorExplorer } from './ErrorExplorer';

// Attach to window for browser global access
if (typeof window !== 'undefined') {
  (window as any).ErrorExplorer = ErrorExplorer;
}

// Export singleton directly
export default ErrorExplorer;
