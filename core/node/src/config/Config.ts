/**
 * Configuration module for @error-explorer/node SDK
 */

import * as os from 'node:os';
import type { InitOptions, ResolvedConfig } from '../types.js';

const DEFAULT_ENDPOINT = 'https://error-explorer.com/api/v1/webhook';

/**
 * Parse DSN string to extract token and endpoint
 * DSN format: http(s)://token@host/path
 * Example: https://ee_abc123@error-explorer.com/api/v1/webhook
 */
export function parseDsn(dsn: string): { token: string; endpoint: string } {
  let url: URL;

  try {
    url = new URL(dsn);
  } catch {
    throw new Error(`Invalid DSN format: ${dsn}. Expected format: https://token@host/path`);
  }

  const token = url.username;

  if (!token) {
    throw new Error('DSN must contain a token (username part)');
  }

  // Reconstruct endpoint without credentials
  url.username = '';
  url.password = '';

  return {
    token,
    endpoint: url.toString().replace(/\/$/, ''),
  };
}

/**
 * Detect environment from NODE_ENV or other sources
 */
function detectEnvironment(): string {
  return process.env['NODE_ENV'] || 'development';
}

/**
 * Get default server name
 */
function getDefaultServerName(): string {
  try {
    return os.hostname();
  } catch {
    return 'unknown';
  }
}

/**
 * Resolve full configuration from options
 */
export function resolveConfig(options: InitOptions): ResolvedConfig {
  // Token/DSN handling
  let token: string;
  let endpoint: string;

  if (options.dsn) {
    const parsed = parseDsn(options.dsn);
    token = parsed.token;
    endpoint = options.endpoint || parsed.endpoint;
  } else if (options.token) {
    token = options.token;
    endpoint = options.endpoint || DEFAULT_ENDPOINT;
  } else {
    throw new Error('Either token or dsn must be provided');
  }

  // Validate token format
  if (!token.startsWith('ee_')) {
    console.warn('[ErrorExplorer] Token should start with "ee_" prefix');
  }

  return {
    token,
    endpoint,
    environment: options.environment || detectEnvironment(),
    release: options.release || '',
    serverName: options.serverName || getDefaultServerName(),

    autoCapture: {
      uncaughtExceptions: options.autoCapture?.uncaughtExceptions ?? true,
      unhandledRejections: options.autoCapture?.unhandledRejections ?? true,
      console: options.autoCapture?.console ?? false,
    },

    breadcrumbs: {
      enabled: options.breadcrumbs?.enabled ?? true,
      maxBreadcrumbs: options.breadcrumbs?.maxBreadcrumbs ?? 50,
      http: options.breadcrumbs?.http ?? true,
      console: options.breadcrumbs?.console ?? true,
    },

    beforeSend: options.beforeSend,
    ignoreErrors: options.ignoreErrors || [],
    maxRetries: options.maxRetries ?? 3,
    timeout: options.timeout ?? 5000,
    debug: options.debug ?? false,
    hmacSecret: options.hmacSecret,
    exitOnUncaughtException: options.exitOnUncaughtException ?? true,
  };
}

/**
 * Check if a string matches any pattern
 */
export function matchesPattern(str: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return str.includes(pattern);
    }
    return pattern.test(str);
  });
}
