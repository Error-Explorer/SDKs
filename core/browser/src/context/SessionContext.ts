import type { SessionContext } from '../types';
import { generateShortId } from '../utils/uuid';

const SESSION_KEY = 'ee_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface StoredSession {
  id: string;
  started_at: string;
  last_activity: number;
  page_views: number;
}

/**
 * Session manager - tracks user sessions across page views
 */
export class SessionManager {
  private session: StoredSession | null = null;

  constructor() {
    this.loadOrCreateSession();
  }

  /**
   * Get current session context
   */
  getContext(): SessionContext {
    this.ensureActiveSession();

    return {
      id: this.session!.id,
      started_at: this.session!.started_at,
      page_views: this.session!.page_views,
    };
  }

  /**
   * Record a page view
   */
  recordPageView(): void {
    this.ensureActiveSession();
    this.session!.page_views++;
    this.session!.last_activity = Date.now();
    this.saveSession();
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    this.ensureActiveSession();
    return this.session!.id;
  }

  /**
   * Load existing session or create a new one
   */
  private loadOrCreateSession(): void {
    const stored = this.loadSession();

    if (stored && this.isSessionValid(stored)) {
      this.session = stored;
      this.session.last_activity = Date.now();
      this.session.page_views++;
      this.saveSession();
    } else {
      this.createNewSession();
    }
  }

  /**
   * Ensure we have an active session
   */
  private ensureActiveSession(): void {
    if (!this.session || !this.isSessionValid(this.session)) {
      this.createNewSession();
    }
  }

  /**
   * Create a new session
   */
  private createNewSession(): void {
    this.session = {
      id: generateShortId(),
      started_at: new Date().toISOString(),
      last_activity: Date.now(),
      page_views: 1,
    };
    this.saveSession();
  }

  /**
   * Check if session is still valid (not timed out)
   */
  private isSessionValid(session: StoredSession): boolean {
    const elapsed = Date.now() - session.last_activity;
    return elapsed < SESSION_TIMEOUT_MS;
  }

  /**
   * Load session from storage
   */
  private loadSession(): StoredSession | null {
    try {
      if (typeof sessionStorage === 'undefined') {
        return null;
      }

      const data = sessionStorage.getItem(SESSION_KEY);
      if (!data) {
        return null;
      }

      return JSON.parse(data) as StoredSession;
    } catch {
      return null;
    }
  }

  /**
   * Save session to storage
   */
  private saveSession(): void {
    try {
      if (typeof sessionStorage === 'undefined' || !this.session) {
        return;
      }

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    } catch {
      // Storage might be full or disabled
    }
  }
}

// Singleton instance
let instance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!instance) {
    instance = new SessionManager();
  }
  return instance;
}

export function resetSessionManager(): void {
  instance = null;
}
