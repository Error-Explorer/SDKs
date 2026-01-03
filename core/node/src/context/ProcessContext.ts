/**
 * Process context collector
 */

import type { ProcessContext as ProcessContextType } from '../types.js';

/**
 * Collect current process context
 */
export function collectProcessContext(): ProcessContextType {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    pid: process.pid,
    ppid: process.ppid,
    uptime: process.uptime(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
  };
}
