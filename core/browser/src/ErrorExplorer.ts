import type {
  InitOptions,
  ResolvedConfig,
  Breadcrumb,
  UserContext,
  CaptureContext,
  SeverityLevel,
  ErrorEvent,
} from './types';
import { resolveConfig, matchesPattern } from './config/Config';
import { parseStackTrace, getErrorName, getErrorMessage, getErrorStack } from './utils/stacktrace';
import { generateUuid } from './utils/uuid';

// Breadcrumbs
import {
  initBreadcrumbManager,
  getBreadcrumbManager,
  resetBreadcrumbManager,
} from './breadcrumbs/BreadcrumbManager';
import { getClickTracker, resetClickTracker } from './breadcrumbs/ClickTracker';
import { getNavigationTracker, resetNavigationTracker } from './breadcrumbs/NavigationTracker';
import { getFetchTracker, resetFetchTracker } from './breadcrumbs/FetchTracker';
import { getXHRTracker, resetXHRTracker } from './breadcrumbs/XHRTracker';
import { getConsoleTracker, resetConsoleTracker } from './breadcrumbs/ConsoleTracker';
import { getInputTracker, resetInputTracker } from './breadcrumbs/InputTracker';

// Capture
import type { CapturedError } from './capture/ErrorCapture';
import { getErrorCapture, resetErrorCapture } from './capture/ErrorCapture';
import { getPromiseCapture, resetPromiseCapture } from './capture/PromiseCapture';
import { getConsoleCapture, resetConsoleCapture } from './capture/ConsoleCapture';

// Context
import { collectBrowserContext } from './context/BrowserContext';
import { getSessionManager, resetSessionManager } from './context/SessionContext';
import { getUserContextManager, resetUserContextManager } from './context/UserContext';
import { collectRequestContext } from './context/RequestContext';

// Transport
import { HttpTransport } from './transport/HttpTransport';
import { getRateLimiter, resetRateLimiter } from './transport/RateLimiter';
import { getRetryManager, resetRetryManager } from './transport/RetryManager';
import { getOfflineQueue, resetOfflineQueue } from './transport/OfflineQueue';

// Security
import { initDataScrubber, resetDataScrubber } from './security/DataScrubber';

const SDK_NAME = '@error-explorer/browser';
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

      // Initialize transport
      this.transport = new HttpTransport({
        endpoint: this.config.endpoint,
        token: this.config.token,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
        hmacSecret: this.config.hmacSecret,
      });

      // Initialize data scrubber
      initDataScrubber();

      // Setup send function for retry/offline managers
      const sendFn = this.sendEvent.bind(this);
      getRetryManager().setSendFunction(sendFn);
      getOfflineQueue(this.config.offline).setSendFunction(sendFn);

      // Initialize breadcrumbs
      if (this.config.breadcrumbs.enabled) {
        initBreadcrumbManager(this.config);
        this.startBreadcrumbTrackers();
      }

      // Setup error captures
      if (this.config.autoCapture.errors) {
        getErrorCapture().start(this.handleCapturedError.bind(this));
      }

      if (this.config.autoCapture.unhandledRejections) {
        getPromiseCapture().start(this.handleCapturedError.bind(this));
      }

      if (this.config.autoCapture.console) {
        getConsoleCapture().start(this.handleCapturedError.bind(this));
      }

      // Record page view
      getSessionManager().recordPageView();

      // Flush offline queue on init
      getOfflineQueue(this.config.offline).flush();

      this.initialized = true;

      if (this.config.debug) {
        console.log('[ErrorExplorer] Initialized', {
          endpoint: this.config.endpoint,
          environment: this.config.environment,
        });
      }
    } catch (error) {
      console.error('[ErrorExplorer] Initialization failed:', error);
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
  setUser(user: UserContext): void {
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
  setExtra(extra: Record<string, unknown>): void {
    this.extra = { ...this.extra, ...extra };
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
   * Flush all pending events
   */
  async flush(timeout = 5000): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => resolve(false), timeout);

      Promise.all([getOfflineQueue().flush()])
        .then(() => {
          clearTimeout(timeoutId);
          resolve(true);
        })
        .catch(() => {
          clearTimeout(timeoutId);
          resolve(false);
        });
    });
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
    resetErrorCapture();
    resetPromiseCapture();
    resetConsoleCapture();
    resetSessionManager();
    resetUserContextManager();
    resetRateLimiter();
    resetRetryManager();
    resetOfflineQueue();
    resetDataScrubber();

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
    if (this.shouldIgnoreError(captured)) {
      if (this.config.debug) {
        console.log('[ErrorExplorer] Ignoring error:', captured.message);
      }
      return;
    }

    const event = this.buildEventFromCapture(captured);
    this.processAndSend(event);
  }

  /**
   * Check if an error should be ignored
   */
  private shouldIgnoreError(captured: CapturedError): boolean {
    if (!this.config) {
      return true;
    }

    // Check ignoreErrors patterns
    if (matchesPattern(captured.message, this.config.ignoreErrors)) {
      return true;
    }

    // Check denyUrls
    if (captured.filename && matchesPattern(captured.filename, this.config.denyUrls)) {
      return true;
    }

    // Check allowUrls (if specified, only allow these)
    if (this.config.allowUrls.length > 0 && captured.filename) {
      if (!matchesPattern(captured.filename, this.config.allowUrls)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Build event from captured error
   */
  private buildEventFromCapture(captured: CapturedError): ErrorEvent {
    return this.buildEvent(
      captured.originalError || new Error(captured.message),
      undefined,
      captured.severity
    );
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

    // Get project name from config or derive from token
    const project = config.project || this.deriveProjectName(config.token);

    const event: ErrorEvent = {
      message,
      project,
      exception_class: name,
      file: topFrame?.filename || 'unknown',
      line: topFrame?.lineno || 0,
      column: topFrame?.colno,
      stack_trace: stack,
      frames,
      severity: context?.level ?? severity,
      environment: config.environment,
      release: config.release || undefined,
      timestamp: new Date().toISOString(),

      // User context
      user: context?.user ?? getUserContextManager().getUser() ?? undefined,

      // Request context
      request: collectRequestContext(),

      // Browser context
      browser: collectBrowserContext(),

      // Session context
      session: getSessionManager().getContext(),

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
  private processAndSend(event: ErrorEvent): void {
    if (!this.config) {
      return;
    }

    // Apply beforeSend hook
    let processedEvent: ErrorEvent | null = event;
    if (this.config.beforeSend) {
      try {
        processedEvent = this.config.beforeSend(event);
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

    // Check rate limiter
    if (!getRateLimiter().isAllowed()) {
      if (this.config.debug) {
        console.log('[ErrorExplorer] Rate limit exceeded, queuing event');
      }
      getRetryManager().enqueue(processedEvent);
      return;
    }

    // Check if offline
    if (!getOfflineQueue(this.config.offline).isOnline()) {
      getOfflineQueue(this.config.offline).enqueue(processedEvent);
      return;
    }

    // Send event
    this.sendEvent(processedEvent);
  }

  /**
   * Send event to the API
   */
  private async sendEvent(event: ErrorEvent): Promise<boolean> {
    if (!this.transport) {
      return false;
    }

    const success = await this.transport.send(event);

    if (!success && this.config?.offline) {
      // Queue for retry
      getRetryManager().enqueue(event);
    }

    return success;
  }

  /**
   * Start all breadcrumb trackers
   */
  private startBreadcrumbTrackers(): void {
    if (!this.config) {
      return;
    }

    const bc = this.config.breadcrumbs;

    if (bc.clicks) {
      getClickTracker().start();
    }

    if (bc.navigation) {
      getNavigationTracker().start();
    }

    if (bc.fetch) {
      getFetchTracker().start();
    }

    if (bc.xhr) {
      getXHRTracker().start();
    }

    if (bc.console) {
      getConsoleTracker().start();
    }

    if (bc.inputs) {
      getInputTracker().start();
    }
  }

  /**
   * Stop all breadcrumb trackers
   */
  private stopAllTrackers(): void {
    resetClickTracker();
    resetNavigationTracker();
    resetFetchTracker();
    resetXHRTracker();
    resetConsoleTracker();
    resetInputTracker();
  }

  /**
   * Derive project name from token or use default
   */
  private deriveProjectName(token: string): string {
    // If token starts with ee_, use a sanitized version as project name
    if (token.startsWith('ee_')) {
      // Take first 16 chars after ee_ for project identifier
      return `project_${token.slice(3, 19)}`;
    }
    // Fallback to generic name
    return 'browser-app';
  }
}

// Export singleton instance
export const ErrorExplorer = new ErrorExplorerClient();
