/**
 * Core types for @error-explorer/node SDK
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

// ══════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════

export interface InitOptions {
  /** Webhook token (required) - format: ee_xxx */
  token?: string;

  /** Full DSN URL (alternative to token) - format: http(s)://token@host/path */
  dsn?: string;

  /** Environment name (production, staging, development) */
  environment?: string;

  /** Application release/version */
  release?: string;

  /** Server/hostname name */
  serverName?: string;

  /** API endpoint URL (auto-detected from token/dsn) */
  endpoint?: string;

  /** Auto capture settings */
  autoCapture?: {
    /** Capture uncaughtException (default: true) */
    uncaughtExceptions?: boolean;
    /** Capture unhandledRejection (default: true) */
    unhandledRejections?: boolean;
    /** Capture console.error calls (default: false) */
    console?: boolean;
  };

  /** Breadcrumbs settings */
  breadcrumbs?: {
    /** Enable breadcrumbs (default: true) */
    enabled?: boolean;
    /** Maximum breadcrumbs to keep (default: 50) */
    maxBreadcrumbs?: number;
    /** Track HTTP requests (default: true) */
    http?: boolean;
    /** Track console logs (default: true) */
    console?: boolean;
  };

  /** Hook to modify/filter events before sending */
  beforeSend?: (event: ErrorEvent) => ErrorEvent | null | Promise<ErrorEvent | null>;

  /** Error messages to ignore */
  ignoreErrors?: (string | RegExp)[];

  /** Maximum retries for failed requests (default: 3) */
  maxRetries?: number;

  /** Request timeout in ms (default: 5000) */
  timeout?: number;

  /** Enable debug mode (default: false) */
  debug?: boolean;

  /** HMAC secret for signed requests (optional) */
  hmacSecret?: string;

  /** Exit on uncaughtException (default: true) - recommended to leave as true */
  exitOnUncaughtException?: boolean;
}

// ══════════════════════════════════════════════════════════
// USER CONTEXT
// ══════════════════════════════════════════════════════════

export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  ip_address?: string;
  role?: string;
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════
// BREADCRUMBS
// ══════════════════════════════════════════════════════════

export type BreadcrumbType =
  | 'http'
  | 'console'
  | 'query'
  | 'navigation'
  | 'error'
  | 'debug'
  | 'custom';

export type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error';

export interface Breadcrumb {
  type: BreadcrumbType;
  category?: string;
  message?: string;
  level?: BreadcrumbLevel;
  data?: Record<string, unknown>;
  timestamp?: number;
}

export interface InternalBreadcrumb extends Breadcrumb {
  timestamp: number;
}

// ══════════════════════════════════════════════════════════
// ERROR EVENT
// ══════════════════════════════════════════════════════════

export type SeverityLevel = 'critical' | 'error' | 'warning' | 'info' | 'notice' | 'debug';

export interface StackFrame {
  filename?: string;
  function?: string;
  lineno?: number;
  colno?: number;
  in_app?: boolean;
  context_line?: string;
  pre_context?: string[];
  post_context?: string[];
  abs_path?: string;
  module?: string;
}

export interface ErrorEvent {
  /** Error message */
  message: string;

  /** Exception class name (TypeError, Error, etc.) */
  exception_class?: string;

  /** Source file */
  file?: string;

  /** Line number */
  line?: number;

  /** Column number */
  column?: number;

  /** Full stack trace as string */
  stack_trace?: string;

  /** Parsed stack frames */
  frames?: StackFrame[];

  /** Severity level */
  severity: SeverityLevel;

  /** Environment */
  environment?: string;

  /** Release version */
  release?: string;

  /** ISO timestamp */
  timestamp: string;

  /** User context */
  user?: UserContext;

  /** Request context (from HTTP middleware) */
  request?: RequestContext;

  /** Server context */
  server?: ServerContext;

  /** Runtime context (Node.js info) */
  runtime?: RuntimeContext;

  /** OS context */
  os?: OsContext;

  /** Process context */
  process?: ProcessContext;

  /** Breadcrumbs (last N actions before error) */
  breadcrumbs?: InternalBreadcrumb[];

  /** Custom tags */
  tags?: Record<string, string>;

  /** Extra data */
  extra?: Record<string, unknown>;

  /** Custom contexts */
  contexts?: Record<string, Record<string, unknown>>;

  /** SDK info */
  sdk: SdkInfo;

  /** Event fingerprint for grouping */
  fingerprint?: string[];

  /** Transaction/request ID */
  transaction?: string;
}

// ══════════════════════════════════════════════════════════
// CONTEXTS
// ══════════════════════════════════════════════════════════

export interface RequestContext {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query_string?: string;
  data?: unknown;
  cookies?: Record<string, string>;
  env?: Record<string, string>;
}

export interface ServerContext {
  name?: string;
  hostname?: string;
}

export interface RuntimeContext {
  name: string;
  version: string;
}

export interface OsContext {
  name?: string;
  version?: string;
  arch?: string;
  kernel_version?: string;
}

export interface ProcessContext {
  pid: number;
  ppid?: number;
  uptime?: number;
  memory?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers?: number;
  };
  cpu?: {
    user: number;
    system: number;
  };
}

export interface SdkInfo {
  name: string;
  version: string;
}

// ══════════════════════════════════════════════════════════
// CAPTURE CONTEXT (for manual capture)
// ══════════════════════════════════════════════════════════

export interface CaptureContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: UserContext;
  level?: SeverityLevel;
  fingerprint?: string[];
  request?: IncomingMessage;
}

// ══════════════════════════════════════════════════════════
// TRANSPORT
// ══════════════════════════════════════════════════════════

export interface TransportOptions {
  endpoint: string;
  token: string;
  timeout: number;
  maxRetries: number;
  hmacSecret?: string;
  debug?: boolean;
}

export interface QueuedEvent {
  event: ErrorEvent;
  retries: number;
  timestamp: number;
}

// ══════════════════════════════════════════════════════════
// INTERNAL CONFIG
// ══════════════════════════════════════════════════════════

export interface ResolvedConfig {
  token: string;
  endpoint: string;
  environment: string;
  release: string;
  serverName: string;
  autoCapture: {
    uncaughtExceptions: boolean;
    unhandledRejections: boolean;
    console: boolean;
  };
  breadcrumbs: {
    enabled: boolean;
    maxBreadcrumbs: number;
    http: boolean;
    console: boolean;
  };
  beforeSend?: (event: ErrorEvent) => ErrorEvent | null | Promise<ErrorEvent | null>;
  ignoreErrors: (string | RegExp)[];
  maxRetries: number;
  timeout: number;
  debug: boolean;
  hmacSecret?: string;
  exitOnUncaughtException: boolean;
}

// ══════════════════════════════════════════════════════════
// MIDDLEWARE TYPES
// ══════════════════════════════════════════════════════════

export interface RequestWithErrorExplorer extends IncomingMessage {
  errorExplorer?: {
    transaction?: string;
    user?: UserContext;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    startTime?: number;
  };
}

export type ExpressRequest = RequestWithErrorExplorer & {
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
  cookies?: Record<string, string>;
  path?: string;
  originalUrl?: string;
  ip?: string;
  ips?: string[];
};

export type ExpressResponse = ServerResponse & {
  statusCode: number;
};

export type ExpressNextFunction = (error?: Error | unknown) => void;

export type ExpressMiddleware = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNextFunction
) => void;

export type ExpressErrorMiddleware = (
  error: Error,
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNextFunction
) => void;
