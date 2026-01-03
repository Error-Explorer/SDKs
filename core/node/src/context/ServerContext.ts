/**
 * Server context collector
 */

import * as os from 'node:os';
import type { ServerContext as ServerContextType } from '../types.js';

/**
 * Server context singleton
 */
let serverContext: ServerContextType = {
  name: undefined,
  hostname: os.hostname(),
};

/**
 * Get current server context
 */
export function getServerContext(): ServerContextType {
  return serverContext;
}

/**
 * Set server name
 */
export function setServerName(name: string): void {
  serverContext = {
    ...serverContext,
    name,
  };
}

/**
 * Reset server context (useful for tests)
 */
export function resetServerContext(): void {
  serverContext = {
    name: undefined,
    hostname: os.hostname(),
  };
}
