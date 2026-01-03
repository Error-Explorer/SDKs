/**
 * OS context collector
 */

import * as os from 'node:os';
import type { OsContext as OsContextType } from '../types.js';

/**
 * Collect OS context (cached - doesn't change during runtime)
 */
let cachedOsContext: OsContextType | null = null;

export function collectOsContext(): OsContextType {
  if (cachedOsContext) {
    return cachedOsContext;
  }

  cachedOsContext = {
    name: os.platform(),
    version: os.release(),
    arch: os.arch(),
    kernel_version: os.version(),
  };

  return cachedOsContext;
}

/**
 * Reset cached OS context (useful for tests)
 */
export function resetOsContext(): void {
  cachedOsContext = null;
}
