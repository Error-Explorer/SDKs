/**
 * Runtime context collector
 */

import type { RuntimeContext as RuntimeContextType } from '../types.js';

/**
 * Collect runtime context (cached)
 */
let cachedRuntimeContext: RuntimeContextType | null = null;

export function collectRuntimeContext(): RuntimeContextType {
  if (cachedRuntimeContext) {
    return cachedRuntimeContext;
  }

  cachedRuntimeContext = {
    name: 'node',
    version: process.version,
  };

  return cachedRuntimeContext;
}

/**
 * Reset cached runtime context (useful for tests)
 */
export function resetRuntimeContext(): void {
  cachedRuntimeContext = null;
}
