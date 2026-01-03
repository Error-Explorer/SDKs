import type { UserContext } from '../types';

/**
 * Manages user context
 */
export class UserContextManager {
  private user: UserContext | null = null;

  /**
   * Set user context
   */
  setUser(user: UserContext): void {
    this.user = { ...user };
  }

  /**
   * Get current user context
   */
  getUser(): UserContext | null {
    return this.user ? { ...this.user } : null;
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.user = null;
  }

  /**
   * Check if user is set
   */
  hasUser(): boolean {
    return this.user !== null;
  }
}

// Singleton instance
let instance: UserContextManager | null = null;

export function getUserContextManager(): UserContextManager {
  if (!instance) {
    instance = new UserContextManager();
  }
  return instance;
}

export function resetUserContextManager(): void {
  instance = null;
}
