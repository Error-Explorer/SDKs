/**
 * Main ErrorExplorer client for Node.js
 */

import type {
  InitOptions,
  ResolvedConfig,
  Breadcrumb,
  UserContext,
  CaptureContext,
  SeverityLevel,
  ErrorEvent,
} from './types.js';
import { resolveConfig, matchesPattern } from './config/Config.js';
import { parseStackTrace, getErrorName, getErrorMessage, getErrorStack } from './utils/stacktrace.js';
import { generateUuid } from './utils/uuid.js';

// Context collectors
import { collectProcessContext } from './context/ProcessContext.js';
import { collectOsContext, resetOsContext } from './context/OsContext.js';
import { collectRuntimeContext, resetRuntimeContext } from './context/RuntimeContext.js';
import { getServerContext, setServerName, resetServerContext } from './context/ServerContext.js';
import { getUserContextManager, resetUserContextManager } from './context/UserContext.js';
import { extractRequestContext } from './context/RequestContext.js';

// Breadcrumbs
import { initBreadcrumbManager, getBreadcrumbManager, resetBreadcrumbManager } from './breadcrumbs/BreadcrumbManager.js';
import { getConsoleTracker, resetConsoleTracker } from './breadcrumbs/ConsoleTracker.js';
import { getHttpTracker, resetHttpTracker } from './breadcrumbs/HttpTracker.js';

// Capture
import type { CapturedError } from './capture/ProcessCapture.js';
import { getProcessCapture, resetProcessCapture } from './capture/ProcessCapture.js';
import { getConsoleCapture, resetConsoleCapture } from './capture/ConsoleCapture.js';

// Transport
import { HttpTransport } from './transport/HttpTransport.js';

const SDK_NAME = '@error-explorer/node';
const SDK_VERSION = '1.0.0';

/**
 * Main ErrorExplorer class - singleton pattern
 */
class ErrorExplorerClient {
  private config: ResolvedConfig | null = null;
  private transport: HttpTransport | null = null;
  private initialized = false;
  private tags: Record<string, string> = {};
  private extra: Record<string, unknown> = {};
  private contexts: Record<string, Record<string, unknown>> = {};

  /**
   * Initialize the SDK
   */
  init(options: InitOptions): void {
    if (this.initialized) {
      console.warn('[ErrorExplorer] Already initialized');
      return;
    }

    try {
      // Resolve configuration
      this.config = resolveConfig(options);

      // Set server name
      if (this.config.serverName) {
        setServerName(this.config.serverName);
      }

      // Initialize transport
      this.transport = new HttpTransport({
        endpoint: this.config.endpoint,
        token: this.config.token,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
        hmacSecret: this.config.hmacSecret,
        debug: this.config.debug,
      });

      // Initialize breadcrumbs
      if (this.config.breadcrumbs.enabled) {
        initBreadcrumbManager(this.config);
        this.startBreadcrumbTrackers();
      }

      // Setup error captures
      if (this.config.autoCapture.uncaughtExceptions || this.config.autoCapture.unhandledRejections) {
        const processCapture = getProcessCapture();
        if (this.config.autoCapture.uncaughtExceptions) {
          processCapture.startUncaughtException(
            this.handleCapturedError.bind(this),
            this.config.exitOnUncaughtException
          );
        }
        if (this.config.autoCapture.unhandledRejections) {
          processCapture.startUnhandledRejection(this.handleCapturedError.bind(this));
        }
      }

      if (this.config.autoCapture.console) {
        getConsoleCapture().start(this.handleCapturedError.bind(this));
      }

      this.initialized = true;

      if (this.config.debug) {
        console.log('[ErrorExplorer] Initialized', {
          endpoint: this.config.endpoint,
          environment: this.config.environment,
          serverName: this.config.serverName,
        });
      }
    } catch (error) {
      console.error('[ErrorExplorer] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set user context
   */
  setUser(user: UserContext | null): void {
    getUserContextManager().setUser(user);
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    getUserContextManager().clearUser();
  }

  /**
   * Set a single tag
   */
  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  /**
   * Set multiple tags
   */
  setTags(tags: Record<string, string>): void {
    this.tags = { ...this.tags, ...tags };
  }

  /**
   * Set extra data
   */
  setExtra(key: string, value: unknown): void {
    this.extra[key] = value;
  }

  /**
   * Set a named context
   */
  setContext(name: string, context: Record<string, unknown>): void {
    this.contexts[name] = context;
  }

  /**
   * Add a manual breadcrumb
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    const manager = getBreadcrumbManager();
    if (manager) {
      manager.add(breadcrumb);
    }
  }

  /**
   * Capture an exception manually
   */
  captureException(error: Error | unknown, context?: CaptureContext): string {
    if (!this.initialized || !this.config) {
      console.warn('[ErrorExplorer] Not initialized');
      return '';
    }

    const eventId = generateUuid();
    const event = this.buildEvent(error, context, 'error');
    this.processAndSend(event);
    return eventId;
  }

  /**
   * Capture a message manually
   */
  captureMessage(message: string, level: SeverityLevel = 'info'): string {
    if (!this.initialized || !this.config) {
      console.warn('[ErrorExplorer] Not initialized');
      return '';
    }

    const eventId = generateUuid();
    const event = this.buildEvent(new Error(message), undefined, level);
    event.exception_class = 'Message';
    this.processAndSend(event);
    return eventId;
  }

  /**
   * Flush all pending events (best effort)
   */
  async flush(timeout = 5000): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    // In Node.js, we don't have an offline queue like the browser
    // Just wait a bit for any pending requests
    await new Promise((resolve) => setTimeout(resolve, Math.min(timeout, 100)));
    return true;
  }

  /**
   * Close the SDK and cleanup
   */
  async close(timeout = 5000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    // Flush pending events
    await this.flush(timeout);

    // Stop all trackers and captures
    this.stopAllTrackers();

    // Reset all singletons
    resetBreadcrumbManager();
    resetProcessCapture();
    resetConsoleCapture();
    resetConsoleTracker();
    resetHttpTracker();
    resetUserContextManager();
    resetServerContext();
    resetOsContext();
    resetRuntimeContext();

    this.config = null;
    this.transport = null;
    this.initialized = false;
    this.tags = {};
    this.extra = {};
    this.contexts = {};

    return true;
  }

  /**
   * Handle a captured error from auto-capture
   */
  private handleCapturedError(captured: CapturedError): void {
    if (!this.config) {
      return;
    }

    // Check if error should be ignored
    if (this.shouldIgnoreError(captured.message)) {
      if (this.config.debug) {
        console.log('[ErrorExplorer] Ignoring error:', captured.message);
      }
      return;
    }

    const event = this.buildEvent(captured.error, undefined, captured.severity);

    // Add capture type to tags
    event.tags = {
      ...event.tags,
      capture_type: captured.type,
    };

    this.processAndSend(event);
  }

  /**
   * Check if an error should be ignored
   */
  private shouldIgnoreError(message: string): boolean {
    if (!this.config) {
      return true;
    }

    return matchesPattern(message, this.config.ignoreErrors);
  }

  /**
   * Build a complete error event
   */
  private buildEvent(
    error: Error | unknown,
    context?: CaptureContext,
    severity: SeverityLevel = 'error'
  ): ErrorEvent {
    const config = this.config!;

    const message = getErrorMessage(error);
    const name = getErrorName(error);
    const stack = getErrorStack(error);

    // Parse stack trace
    const frames = parseStackTrace(stack);
    const topFrame = frames[0];

    const event: ErrorEvent = {
      message,
      exception_class: name,
      file: topFrame?.filename,
      line: topFrame?.lineno,
      column: topFrame?.colno,
      stack_trace: stack,
      frames,
      severity: context?.level ?? severity,
      environment: config.environment,
      release: config.release || undefined,
      timestamp: new Date().toISOString(),

      // User context
      user: context?.user ?? getUserContextManager().getUser() ?? undefined,

      // Server context
      server: getServerContext(),

      // Runtime context
      runtime: collectRuntimeContext(),

      // OS context
      os: collectOsContext(),

      // Process context
      process: collectProcessContext(),

      // Request context (if provided)
      request: context?.request ? extractRequestContext(context.request) : undefined,

      // Breadcrumbs
      breadcrumbs: getBreadcrumbManager()?.getAll(),

      // Tags (merge global + context)
      tags: { ...this.tags, ...context?.tags },

      // Extra data
      extra: { ...this.extra, ...context?.extra },

      // Custom contexts
      contexts: this.contexts,

      // SDK info
      sdk: {
        name: SDK_NAME,
        version: SDK_VERSION,
      },

      // Fingerprint for grouping
      fingerprint: context?.fingerprint,
    };

    return event;
  }

  /**
   * Process event through beforeSend and send
   */
  private async processAndSend(event: ErrorEvent): Promise<void> {
    if (!this.config || !this.transport) {
      return;
    }

    // Apply beforeSend hook
    let processedEvent: ErrorEvent | null = event;
    if (this.config.beforeSend) {
      try {
        const result = this.config.beforeSend(event);
        processedEvent = result instanceof Promise ? await result : result;
      } catch (e) {
        console.error('[ErrorExplorer] beforeSend threw an error:', e);
        processedEvent = event;
      }
    }

    // If beforeSend returned null, drop the event
    if (!processedEvent) {
      if (this.config.debug) {
        console.log('[ErrorExplorer] Event dropped by beforeSend');
      }
      return;
    }

    // Send event
    await this.transport.send(processedEvent);
  }

  /**
   * Start all breadcrumb trackers
   */
  private startBreadcrumbTrackers(): void {
    if (!this.config) {
      return;
    }

    const bc = this.config.breadcrumbs;

    if (bc.console) {
      getConsoleTracker().start();
    }

    if (bc.http) {
      getHttpTracker().start();
    }
  }

  /**
   * Stop all breadcrumb trackers
   */
  private stopAllTrackers(): void {
    resetConsoleTracker();
    resetHttpTracker();
  }
}

// Export singleton instance
export const ErrorExplorer = new ErrorExplorerClient();
