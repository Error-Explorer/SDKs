/**
 * Core types for @error-explorer/browser SDK
 */

// ══════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════

export interface InitOptions {
  /** Webhook token (required) - format: ee_xxx */
  token: string;

  /** Full DSN URL (alternative to token) */
  dsn?: string;

  /** Environment name (production, staging, development) */
  environment?: string;

  /** Application release/version */
  release?: string;

  /** Project name (used for grouping errors) */
  project?: string;

  /** API endpoint URL (auto-detected from token/dsn) */
  endpoint?: string;

  /** Auto capture settings */
  autoCapture?: {
    /** Capture window.onerror errors (default: true) */
    errors?: boolean;
    /** Capture unhandled promise rejections (default: true) */
    unhandledRejections?: boolean;
    /** Capture console.error calls (default: true) */
    console?: boolean;
  };

  /** Breadcrumbs settings */
  breadcrumbs?: {
    /** Enable breadcrumbs (default: true) */
    enabled?: boolean;
    /** Maximum breadcrumbs to keep (default: 20) */
    maxBreadcrumbs?: number;
    /** Track click events (default: true) */
    clicks?: boolean;
    /** Track navigation events (default: true) */
    navigation?: boolean;
    /** Track fetch requests (default: true) */
    fetch?: boolean;
    /** Track XHR requests (default: true) */
    xhr?: boolean;
    /** Track console logs (default: true) */
    console?: boolean;
    /** Track input focus events (default: false) */
    inputs?: boolean;
  };

  /** Hook to modify/filter events before sending */
  beforeSend?: (event: ErrorEvent) => ErrorEvent | null;

  /** URLs to ignore (errors from these URLs won't be sent) */
  denyUrls?: (string | RegExp)[];

  /** Only capture errors from these URLs */
  allowUrls?: (string | RegExp)[];

  /** Error messages to ignore */
  ignoreErrors?: (string | RegExp)[];

  /** Maximum retries for failed requests (default: 3) */
  maxRetries?: number;

  /** Request timeout in ms (default: 5000) */
  timeout?: number;

  /** Enable offline queue (default: true) */
  offline?: boolean;

  /** Enable debug mode (default: false) */
  debug?: boolean;

  /** HMAC secret for signed requests (optional) */
  hmacSecret?: string;
}

// ══════════════════════════════════════════════════════════
// USER CONTEXT
// ══════════════════════════════════════════════════════════

export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════
// BREADCRUMBS
// ══════════════════════════════════════════════════════════

export type BreadcrumbType =
  | 'click'
  | 'navigation'
  | 'fetch'
  | 'xhr'
  | 'console'
  | 'input'
  | 'user-action'
  | 'debug'
  | 'error'
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
}

export interface ErrorEvent {
  /** Error message */
  message: string;

  /** Project name (required by webhook) */
  project: string;

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

  /** Request context */
  request?: RequestContext;

  /** Browser context */
  browser?: BrowserContext;

  /** Session context */
  session?: SessionContext;

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
}

// ══════════════════════════════════════════════════════════
// CONTEXTS
// ══════════════════════════════════════════════════════════

export interface RequestContext {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  query_string?: string;
}

export interface BrowserContext {
  name?: string;
  version?: string;
  user_agent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  language?: string;
  online?: boolean;
  memory?: {
    used_js_heap_size?: number;
    total_js_heap_size?: number;
    js_heap_size_limit?: number;
  };
}

export interface SessionContext {
  id: string;
  started_at: string;
  page_views: number;
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
  project?: string;
  autoCapture: {
    errors: boolean;
    unhandledRejections: boolean;
    console: boolean;
  };
  breadcrumbs: {
    enabled: boolean;
    maxBreadcrumbs: number;
    clicks: boolean;
    navigation: boolean;
    fetch: boolean;
    xhr: boolean;
    console: boolean;
    inputs: boolean;
  };
  beforeSend?: (event: ErrorEvent) => ErrorEvent | null;
  denyUrls: (string | RegExp)[];
  allowUrls: (string | RegExp)[];
  ignoreErrors: (string | RegExp)[];
  maxRetries: number;
  timeout: number;
  offline: boolean;
  debug: boolean;
  hmacSecret?: string;
}
