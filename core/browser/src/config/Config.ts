import type { InitOptions, ResolvedConfig } from '../types';

const DEFAULT_ENDPOINT = 'https://error-explorer.com/api/v1/webhook';

const DEFAULT_CONFIG: Omit<ResolvedConfig, 'token' | 'endpoint'> = {
  environment: 'production',
  release: '',
  autoCapture: {
    errors: true,
    unhandledRejections: true,
    console: true,
  },
  breadcrumbs: {
    enabled: true,
    maxBreadcrumbs: 20,
    clicks: true,
    navigation: true,
    fetch: true,
    xhr: true,
    console: true,
    inputs: false,
  },
  denyUrls: [],
  allowUrls: [],
  ignoreErrors: [],
  maxRetries: 3,
  timeout: 5000,
  offline: true,
  debug: false,
};

/**
 * Parse DSN to extract token and endpoint
 * DSN format: https://{token}@{host}/api/v1/webhook
 */
function parseDsn(dsn: string): { token: string; endpoint: string } | null {
  try {
    const url = new URL(dsn);
    const token = url.username;
    if (!token) {
      return null;
    }

    // Remove username from URL to get endpoint
    url.username = '';
    const endpoint = url.toString();

    return { token, endpoint };
  } catch {
    return null;
  }
}

/**
 * Build endpoint URL from token
 */
function buildEndpoint(token: string, baseEndpoint: string): string {
  // If endpoint already contains token placeholder, replace it
  if (baseEndpoint.includes('{token}')) {
    return baseEndpoint.replace('{token}', token);
  }

  // Otherwise append token to endpoint
  const separator = baseEndpoint.endsWith('/') ? '' : '/';
  return `${baseEndpoint}${separator}${token}`;
}

/**
 * Validate and resolve configuration
 */
export function resolveConfig(options: InitOptions): ResolvedConfig {
  let token: string;
  let endpoint: string;

  // Parse DSN if provided
  if (options.dsn) {
    const parsed = parseDsn(options.dsn);
    if (!parsed) {
      throw new Error('[ErrorExplorer] Invalid DSN format');
    }
    token = parsed.token;
    endpoint = parsed.endpoint;
  } else if (options.token) {
    token = options.token;
    endpoint = buildEndpoint(token, options.endpoint ?? DEFAULT_ENDPOINT);
  } else {
    throw new Error('[ErrorExplorer] Either token or dsn is required');
  }

  // Validate token format
  if (!token.startsWith('ee_')) {
    console.warn('[ErrorExplorer] Token should start with "ee_"');
  }

  return {
    token,
    endpoint,
    environment: options.environment ?? DEFAULT_CONFIG.environment,
    release: options.release ?? DEFAULT_CONFIG.release,
    project: options.project,
    autoCapture: {
      ...DEFAULT_CONFIG.autoCapture,
      ...options.autoCapture,
    },
    breadcrumbs: {
      ...DEFAULT_CONFIG.breadcrumbs,
      ...options.breadcrumbs,
    },
    beforeSend: options.beforeSend,
    denyUrls: options.denyUrls ?? DEFAULT_CONFIG.denyUrls,
    allowUrls: options.allowUrls ?? DEFAULT_CONFIG.allowUrls,
    ignoreErrors: options.ignoreErrors ?? DEFAULT_CONFIG.ignoreErrors,
    maxRetries: options.maxRetries ?? DEFAULT_CONFIG.maxRetries,
    timeout: options.timeout ?? DEFAULT_CONFIG.timeout,
    offline: options.offline ?? DEFAULT_CONFIG.offline,
    debug: options.debug ?? DEFAULT_CONFIG.debug,
    hmacSecret: options.hmacSecret,
  };
}

/**
 * Check if URL matches any pattern in list
 */
export function matchesPattern(url: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return pattern.test(url);
  });
}
